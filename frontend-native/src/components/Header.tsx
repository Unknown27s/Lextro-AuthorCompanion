import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, typeScale, spacing } from '../theme';

interface HeaderProps {
    onSearchClick: () => void;
    onSettingsClick: () => void;
    onCameraClick?: () => void;
}

export default function Header({ onSearchClick, onSettingsClick, onCameraClick }: HeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={styles.headerInner}>
                <Text style={styles.logo}>LEXTRO</Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={onSearchClick}
                        style={styles.iconBtn}
                        accessibilityLabel="Search words"
                        activeOpacity={0.7}
                    >
                        <Text style={styles.icon}>⌕</Text>
                    </TouchableOpacity>

                    {onCameraClick && (
                        <TouchableOpacity
                            onPress={onCameraClick}
                            style={styles.iconBtn}
                            accessibilityLabel="Capture words from a photo"
                            activeOpacity={0.7}
                        >
                            <Text style={styles.icon}>▣</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={onSettingsClick}
                        style={styles.iconBtn}
                        accessibilityLabel="Settings"
                        activeOpacity={0.7}
                    >
                        <Text style={styles.icon}>☰</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: colors.surfaceLowest,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outline,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        paddingHorizontal: spacing.gutter,
    },
    logo: {
        fontFamily: fonts.displaySemiBold,
        fontSize: 20,
        letterSpacing: 2,
        color: colors.onSurface,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radius,
        backgroundColor: colors.surfaceLowest,
    },
    icon: {
        fontFamily: fonts.mono,
        fontSize: 20,
        lineHeight: 22,
        color: colors.onSurface,
    },
});
