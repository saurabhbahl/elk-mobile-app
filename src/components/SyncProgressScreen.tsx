import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import AppText from './AppText';
import { useAppContent } from '@/src/contexts/AppContentContext';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function SyncProgressScreen() {
    const { 
        isSyncing, 
        syncProgress, 
        syncStatusText, 
        syncError, 
        performInitialSync 
    } = useAppContent();

    useEffect(() => {
        // Automatically start sync on mount
        performInitialSync();
    }, []);

    const progressPercent = Math.round(syncProgress * 100);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.content}>
                <AppText style={styles.title}>Welcome to Elk Country</AppText>
                <AppText style={styles.subtitle}>
                    We are downloading maps, viewing areas, and offline guides so the app works even in "dead zones" without cell service.
                </AppText>

                <View style={styles.progressContainer}>
                    {syncError ? (
                        <View style={styles.errorBox}>
                            <AppText style={styles.errorText}>{syncError}</AppText>
                            <TouchableOpacity 
                                style={styles.retryButton} 
                                onPress={performInitialSync}
                                activeOpacity={0.8}
                            >
                                <AppText style={styles.retryButtonText}>Retry Setup</AppText>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                            </View>
                            <AppText style={styles.progressText}>{progressPercent}%</AppText>
                            <AppText style={styles.statusText}>{syncStatusText || "Setting up offline database..."}</AppText>
                            <ActivityIndicator size="small" color="#4f5f4b" style={{ marginTop: 24 }} />
                        </>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999, // Ensure it sits on top of everything
    },
    content: {
        width: width * 0.85,
        alignItems: 'center',
        paddingVertical: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E3B2F',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 40,
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4f5f4b', // Forest Green brand default
        borderRadius: 4,
    },
    progressText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4f5f4b',
        marginBottom: 8,
    },
    statusText: {
        fontSize: 13,
        color: '#888888',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    errorBox: {
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    errorText: {
        fontSize: 14,
        color: '#C62828',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    retryButton: {
        backgroundColor: '#C62828',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
