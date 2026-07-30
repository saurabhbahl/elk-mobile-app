import React from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import AppText from './AppText';
import { useNetInfo } from '@react-native-community/netinfo';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OfflineBanner() {
    const netInfo = useNetInfo();
    const isOffline = netInfo.isConnected === false;

    if (!isOffline) return null;

    return (
        <View style={styles.banner}>
            <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#856404" style={styles.icon} />
            <AppText style={styles.text}>Offline Mode. Serving data from local database.</AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#FFF3CD',
        borderColor: '#FFEBAA',
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    icon: {
        marginRight: 8,
    },
    text: {
        fontSize: 12,
        color: '#856404',
        fontWeight: '600',
        textAlign: 'center',
    },
});
