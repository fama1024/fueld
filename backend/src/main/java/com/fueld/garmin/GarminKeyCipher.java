package com.fueld.garmin;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
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
 * Das Geheimnis kommt aus GARMIN_ENCRYPTION_KEY (openssl rand -base64 32). Wer nur die Datenbank
 * sieht, kann die Keys also nicht lesen. Ohne gültiges Geheimnis ist die Funktion deaktiviert
 * (kein Fehler). Geht das Geheimnis verloren, müssen alle Nutzer ihren Key neu eintragen.
 */
@Slf4j
@Component
public class GarminKeyCipher {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int SECRET_BYTES = 32;
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecureRandom random = new SecureRandom();
    private final SecretKey secret;

    public GarminKeyCipher(@Value("${app.garmin.encryption-key:}") String encodedSecret) {
        this.secret = parseSecret(encodedSecret);
        if (secret == null) {
            log.warn("GARMIN_ENCRYPTION_KEY fehlt oder ist ungültig – Garmin-Import deaktiviert");
        }
    }

    public boolean isConfigured() {
        return secret != null;
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
        if (secret == null) throw new GarminException("Garmin-Import ist nicht konfiguriert");
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(mode, secret, new GCMParameterSpec(TAG_BITS, iv));
        return cipher;
    }

    private static SecretKey parseSecret(String encoded) {
        if (encoded == null || encoded.isBlank()) return null;
        try {
            byte[] bytes = Base64.getDecoder().decode(encoded.trim());
            return bytes.length == SECRET_BYTES ? new SecretKeySpec(bytes, "AES") : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
