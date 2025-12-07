import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Award, UserPlus, Trash2, Search, X, Check } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
};

export default function ManageCommunityManagers() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [managers, setManagers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
    const [selectedManager, setSelectedManager] = useState(null);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load community managers
            const { data: managerData } = await supabase
                .from('app_users')
                .select('id, display_name, email, avatar_url')
                .eq('role', 'community_manager');

            // Load all groups
            const { data: groupData } = await supabase
                .from('app_groups')
                .select('id, name, language')
                .order('name');

            // Load manager-group assignments
            const { data: assignmentData } = await supabase
                .from('app_community_managers')
                .select(`
                    user_id,
                    group_id,
                    app_groups (id, name)
                `);

            // Attach assigned groups to managers
            const managersWithGroups = (managerData || []).map(m => ({
                ...m,
                assignedGroups: (assignmentData || [])
                    .filter(a => a.user_id === m.id)
                    .map(a => a.app_groups)
            }));

            setManagers(managersWithGroups);
            setGroups(groupData || []);

            // Load all users for adding new managers
            const { data: allUserData } = await supabase
                .from('app_users')
                .select('id, display_name, email, role')
                .neq('role', 'admin')
                .order('display_name');

            setAllUsers(allUserData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const promoteToManager = async (userId) => {
        try {
            const { error } = await supabase
                .from('app_users')
                .update({ role: 'community_manager' })
                .eq('id', userId);

            if (error) throw error;
            Alert.alert('Success', 'User promoted to Community Manager!');
            setShowAddModal(false);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to promote user');
        }
    };

    const removeManager = async (userId) => {
        Alert.alert(
            'Remove Manager',
            'Are you sure you want to remove this community manager?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Remove group assignments
                            await supabase
                                .from('app_community_managers')
                                .delete()
                                .eq('user_id', userId);

                            // Remove role
                            await supabase
                                .from('app_users')
                                .update({ role: 'user' })
                                .eq('id', userId);

                            loadData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove manager');
                        }
                    }
                }
            ]
        );
    };

    const assignGroup = async (groupId) => {
        if (!selectedManager) return;

        try {
            const { error } = await supabase
                .from('app_community_managers')
                .insert({
                    user_id: selectedManager.id,
                    group_id: groupId
                });

            if (error) throw error;
            Alert.alert('Success', 'Group assigned!');
            setShowAssignGroupModal(false);
            setSelectedManager(null);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to assign group');
        }
    };

    const unassignGroup = async (userId, groupId) => {
        try {
            const { error } = await supabase
                .from('app_community_managers')
                .delete()
                .eq('user_id', userId)
                .eq('group_id', groupId);

            if (error) throw error;
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to unassign group');
        }
    };

    const filteredUsers = allUsers
        .filter(u => u.role !== 'community_manager')
        .filter(u =>
            u.display_name?.toLowerCase().includes(searchText.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchText.toLowerCase())
        );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={SOUP_COLORS.green} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>Community Managers</Text>
                <Pressable onPress={() => setShowAddModal(true)} style={styles.addButton}>
                    <UserPlus size={22} color={SOUP_COLORS.green} />
                </Pressable>
            </View>

            <ScrollView style={styles.content}>
                {managers.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Award size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No community managers yet</Text>
                        <Pressable style={styles.addFirstBtn} onPress={() => setShowAddModal(true)}>
                            <Text style={styles.addFirstBtnText}>Add your first manager</Text>
                        </Pressable>
                    </View>
                ) : (
                    managers.map(manager => (
                        <View key={manager.id} style={styles.managerCard}>
                            <View style={styles.managerHeader}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {manager.display_name?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                </View>
                                <View style={styles.managerInfo}>
                                    <Text style={styles.managerName}>{manager.display_name}</Text>
                                    <Text style={styles.managerEmail}>{manager.email}</Text>
                                </View>
                                <Pressable onPress={() => removeManager(manager.id)} style={styles.removeBtn}>
                                    <Trash2 size={18} color="#FF3B30" />
                                </Pressable>
                            </View>

                            <View style={styles.groupsSection}>
                                <Text style={styles.groupsLabel}>Assigned Groups:</Text>
                                {manager.assignedGroups.length === 0 ? (
                                    <Text style={styles.noGroups}>No groups assigned</Text>
                                ) : (
                                    <View style={styles.groupsList}>
                                        {manager.assignedGroups.map(group => (
                                            <View key={group.id} style={styles.groupChip}>
                                                <Text style={styles.groupChipText}>{group.name}</Text>
                                                <Pressable onPress={() => unassignGroup(manager.id, group.id)}>
                                                    <X size={14} color={SOUP_COLORS.green} />
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                <Pressable
                                    style={styles.assignBtn}
                                    onPress={() => {
                                        setSelectedManager(manager);
                                        setShowAssignGroupModal(true);
                                    }}
                                >
                                    <Text style={styles.assignBtnText}>+ Assign Group</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Add Manager Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Community Manager</Text>
                            <Pressable onPress={() => setShowAddModal(false)}>
                                <X size={24} color="#000" />
                            </Pressable>
                        </View>

                        <View style={styles.searchBox}>
                            <Search size={18} color="#8E8E93" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search users..."
                                value={searchText}
                                onChangeText={setSearchText}
                            />
                        </View>

                        <ScrollView style={styles.userList}>
                            {filteredUsers.map(user => (
                                <Pressable
                                    key={user.id}
                                    style={styles.userItem}
                                    onPress={() => promoteToManager(user.id)}
                                >
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>{user.display_name}</Text>
                                        <Text style={styles.userEmail}>{user.email}</Text>
                                    </View>
                                    <Check size={20} color={SOUP_COLORS.green} />
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Assign Group Modal */}
            <Modal visible={showAssignGroupModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Assign Group to {selectedManager?.display_name}</Text>
                            <Pressable onPress={() => setShowAssignGroupModal(false)}>
                                <X size={24} color="#000" />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.userList}>
                            {groups
                                .filter(g => !selectedManager?.assignedGroups?.some(ag => ag.id === g.id))
                                .map(group => (
                                    <Pressable
                                        key={group.id}
                                        style={styles.userItem}
                                        onPress={() => assignGroup(group.id)}
                                    >
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{group.name}</Text>
                                            <Text style={styles.userEmail}>{group.language}</Text>
                                        </View>
                                        <Check size={20} color={SOUP_COLORS.green} />
                                    </Pressable>
                                ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: SOUP_COLORS.cream },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
    addButton: { padding: 4 },
    content: { flex: 1, padding: 16 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: '#8E8E93', marginTop: 12 },
    addFirstBtn: { marginTop: 16, backgroundColor: SOUP_COLORS.green, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
    addFirstBtnText: { color: '#fff', fontWeight: '600' },
    managerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
    managerHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: SOUP_COLORS.green, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    managerInfo: { flex: 1 },
    managerName: { fontSize: 16, fontWeight: '600', color: '#000' },
    managerEmail: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
    removeBtn: { padding: 8 },
    groupsSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
    groupsLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 8 },
    noGroups: { fontSize: 14, color: '#ccc', fontStyle: 'italic' },
    groupsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    groupChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${SOUP_COLORS.green}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    groupChipText: { fontSize: 13, fontWeight: '500', color: SOUP_COLORS.green },
    assignBtn: { marginTop: 12 },
    assignBtnText: { fontSize: 14, fontWeight: '600', color: SOUP_COLORS.green },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, gap: 8 },
    searchInput: { flex: 1, fontSize: 16 },
    userList: { maxHeight: 400 },
    userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '500', color: '#000' },
    userEmail: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
});
