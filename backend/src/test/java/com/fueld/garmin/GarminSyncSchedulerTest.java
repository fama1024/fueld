package com.fueld.garmin;

import com.fueld.user.User;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GarminSyncSchedulerTest {

    @Test
    void fehlerBeiEinemNutzer_stopptDieAnderenNicht() {
        GarminConnectionService connections = mock(GarminConnectionService.class);
        GarminSyncService syncService = mock(GarminSyncService.class);
        User expired = User.builder().id(UUID.randomUUID()).build();
        User fine = User.builder().id(UUID.randomUUID()).build();
        when(connections.connectedUsers()).thenReturn(List.of(expired, fine));
        when(syncService.sync(expired, GarminSyncService.DEFAULT_DAYS)).thenThrow(new GarminKeyRejectedException(null));

        new GarminSyncScheduler(connections, syncService).dailySync();

        verify(syncService).sync(fine, GarminSyncService.DEFAULT_DAYS);
    }
}
