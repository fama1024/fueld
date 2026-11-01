package com.fueld.garmin;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Verschlüsselt die Garmin-Keys mit AES-GCM, damit sie nicht im Klartext in der Datenbank liegen.
 * Der Schlüssel wird aus JWT_SECRET abgeleitet, es braucht also keine eigene Env-Var, und er ist
 * trotzdem ein anderer als der für die Login-Tokens. Wer nur die Datenbank sieht, kann die Keys
 * nicht lesen. Wird JWT_SECRET geändert, müssen alle Nutzer ihren Key neu eintragen.
 */
@Component
public class GarminKeyCipher {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final String KEY_PURPOSE = "fueld-garmin-api-key-v1";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecureRandom random = new SecureRandom();
    private final SecretKey secret;

    public GarminKeyCipher(@Value("${app.jwt.secret}") String appSecret) {
        this.secret = deriveKey(appSecret);
    }

    public String encrypt(String plainText) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            byte[] encrypted = cipher(Cipher.ENCRYPT_MODE, iv).doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            // Die IV ist nicht geheim, muss aber zum Entschlüsseln mitgespeichert werden
            byte[] stored = ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
            return Base64.getEncoder().encodeToString(stored);
        } catch (GeneralSecurityException e) {
            throw new GarminException("Garmin-Key konnte nicht verschlüsselt werden", e);
        }
    }

    public String decrypt(String stored) {
        try {
            byte[] bytes = Base64.getDecoder().decode(stored);
            byte[] iv = new byte[IV_BYTES];
            System.arraycopy(bytes, 0, iv, 0, IV_BYTES);
            byte[] plain = cipher(Cipher.DECRYPT_MODE, iv).doFinal(bytes, IV_BYTES, bytes.length - IV_BYTES);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new GarminException("Gespeicherter Garmin-Key ist nicht lesbar, bitte im Profil neu eintragen", e);
        }
    }

    private Cipher cipher(int mode, byte[] iv) throws GeneralSecurityException {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(mode, secret, new GCMParameterSpec(TAG_BITS, iv));
        return cipher;
    }

    private static SecretKey deriveKey(String appSecret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return new SecretKeySpec(mac.doFinal(KEY_PURPOSE.getBytes(StandardCharsets.UTF_8)), "AES");
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Garmin-Schlüssel konnte nicht abgeleitet werden", e);
        }
    }
}
