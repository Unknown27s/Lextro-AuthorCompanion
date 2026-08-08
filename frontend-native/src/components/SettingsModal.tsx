import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { colors, typeScale, spacing, frame, buttons } from '../theme';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEditProfile?: () => void;
    onChangePassword?: () => void;
    onExportData?: () => void;
    onAbout?: () => void;
    onDailyReminder?: () => void;
    onPracticeSettings?: () => void;
}

export default function SettingsModal({ isOpen, onClose, onEditProfile, onChangePassword, onExportData, onAbout, onDailyReminder, onPracticeSettings }: SettingsModalProps) {
    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>[SETTINGS]</Text>
                    <ScrollView style={styles.scroll}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>ACCOUNT</Text>
                            <TouchableOpacity
                                style={styles.option}
                                onPress={() => {
                                    onClose();
                                    onEditProfile?.();
                                }}
                            >
                                <Text style={styles.optionText}>EDIT PROFILE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.option}
                                onPress={() => {
                                    onClose();
                                    onChangePassword?.();
                                }}
                            >
                                <Text style={styles.optionText}>CHANGE PASSWORD</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>LEARNING</Text>
                            <TouchableOpacity
                                style={styles.option}
                                onPress={() => {
                                    onClose();
                                    onDailyReminder?.();
                                }}
                            >
                                <Text style={styles.optionText}>DAILY REMINDER</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.option}
                                onPress={() => {
                                    onClose();
                                    onPracticeSettings?.();
                                }}
                            >
                                <Text style={styles.optionText}>PRACTICE SETTINGS</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>DATA</Text>
                            <TouchableOpacity
                                style={styles.option}
                                onPress={() => {
                                    onClose();
                                    onExportData?.();
                                }}
                            >
                                <Text style={styles.optionText}>EXPORT DATA</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>ABOUT</Text>
                            <TouchableOpacity
                                style={styles.option}
                                onPress={() => {
                                    onClose();
                                    onAbout?.();
                                }}
                            >
                                <Text style={styles.optionText}>ABOUT LEXTRO</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                    <TouchableOpacity onPress={onClose} style={[buttons.primary, styles.closeBtn]}>
                        <Text style={buttons.primaryText}>CLOSE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modal: {
        backgroundColor: colors.surfaceLowest,
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radius,
        margin: spacing.gutter,
        maxHeight: '70%',
        width: '85%',
        maxWidth: 400,
    },
    title: {
        ...typeScale.labelMono,
        color: colors.onSurface,
        textAlign: 'center',
        padding: 16,
        letterSpacing: 1.5,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outline,
    },
    scroll: {
        paddingHorizontal: 8,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        letterSpacing: 1,
        marginBottom: 8,
        paddingHorizontal: 16,
        marginTop: 12,
    },
    option: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outlineVariant,
    },
    optionText: {
        ...typeScale.labelMono,
        color: colors.onSurface,
        letterSpacing: 0.5,
    },
    closeBtn: {
        margin: 12,
        alignItems: 'center',
        marginTop: 0,
    },
});
