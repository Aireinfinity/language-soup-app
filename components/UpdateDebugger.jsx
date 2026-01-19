import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import * as Updates from 'expo-updates';

// Temporary debug component - add to your app to see update status
export function UpdateDebugger() {
    useEffect(() => {
        const checkUpdates = async () => {
            try {
                const update = await Updates.checkForUpdateAsync();
                console.log('Update available:', update.isAvailable);
                console.log('Current update ID:', Updates.updateId);
                console.log('Runtime version:', Updates.runtimeVersion);
                console.log('Channel:', Updates.channel);

                if (update.isAvailable) {
                    console.log('Fetching update...');
                    await Updates.fetchUpdateAsync();
                    console.log('Update fetched! Reloading...');
                    await Updates.reloadAsync();
                }
            } catch (e) {
                console.error('Update check failed:', e);
            }
        };

        checkUpdates();
    }, []);

    return (
        <View style={{ padding: 20, backgroundColor: 'yellow' }}>
            <Text>Update ID: {Updates.updateId || 'embedded'}</Text>
            <Text>Runtime: {Updates.runtimeVersion}</Text>
            <Text>Channel: {Updates.channel || 'none'}</Text>
        </View>
    );
}
