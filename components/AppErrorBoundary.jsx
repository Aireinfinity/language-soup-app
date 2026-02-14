import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Catches JS errors in the tree and shows a friendly fallback so the app
 * doesn't white-screen. User can try again or go home.
 */
export class AppErrorBoundary extends React.Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[AppErrorBoundary]', error, errorInfo?.componentStack);
    }

    handleTryAgain = () => {
        this.setState({ error: null });
    };

    render() {
        if (this.state.error) {
            return (
                <AppErrorFallback
                    onTryAgain={this.handleTryAgain}
                    onDismiss={() => this.setState({ error: null })}
                />
            );
        }
        return this.props.children;
    }
}

function AppErrorFallback({ onTryAgain, onDismiss }) {
    const router = useRouter();

    const goHome = () => {
        onDismiss();
        try {
            router.replace('/(tabs)');
        } catch (_) {}
    };

    return (
        <View style={styles.container}>
            <Text style={styles.emoji}>🥣</Text>
            <Text style={styles.title}>something went wrong</Text>
            <Text style={styles.subtitle}>
                not your fault, we hit a glitch. try again or head back home.
            </Text>
            <View style={styles.buttons}>
                <Pressable onPress={onTryAgain} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>try again</Text>
                </Pressable>
                <Pressable onPress={goHome} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>go home</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#FDF5E6',
    },
    emoji: {
        fontSize: 56,
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#141414',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#4a4a4a',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    buttons: {
        gap: 12,
        width: '100%',
        maxWidth: 280,
    },
    primaryButton: {
        backgroundColor: '#2A2A2A',
        paddingVertical: 16,
        borderRadius: 24,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    secondaryButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#4a4a4a',
        fontSize: 16,
        fontWeight: '600',
    },
});

