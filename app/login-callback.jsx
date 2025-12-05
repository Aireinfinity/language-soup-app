import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function LoginCallback() {
    const router = useRouter();

    // The actual token parsing happens in AuthContext.
    // This screen just serves as a valid target for the deep link
    // so Expo Router doesn't complain about unmatched routes.

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.text}>Verifying your soup... 🍲</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    text: {
        marginTop: 20,
        fontSize: 16,
        color: Colors.text,
        fontWeight: '500',
    },
});
