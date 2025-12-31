import { supabase } from './supabase';
import { Alert, Share } from 'react-native';

/**
 * Creates a shareable challenge link and opens native share sheet
 * @param {string} userId - Current user's ID
 * @param {string} groupId - Group ID where challenge was posted
 * @param {string} messageId - Challenge message ID
 * @param {string} language - Language of the group (e.g., "Spanish")
 * @returns {Promise<boolean>} - Success status
 */
export async function shareChallenge(userId, groupId, messageId, language) {
    try {
        // Generate share link via RPC
        const { data: shareLinkId, error } = await supabase
            .rpc('create_challenge_share', {
                p_sharer_user_id: userId,
                p_group_id: groupId,
                p_challenge_message_id: messageId
            });

        if (error) throw error;

        // Build shareable URL
        const shareUrl = `https://language-soup.com/c/${shareLinkId}`;

        // Share message with expiration warning
        const shareMessage = `challenging🔥 you to speak ${language}! ${shareUrl}`;

        // Use React Native Share API
        const result = await Share.share({
            message: shareMessage,
            url: shareUrl, // iOS uses this
            title: `${language} Daily Language Soup Challenge 🔥`
        });

        if (result.action === Share.sharedAction) {
            Alert.alert('✅ Challenge sent! Link expires in 24 hours');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error sharing challenge:', error);
        Alert.alert('Error', 'Failed to create share link. Please try again.');
        return false;
    }
}

/**
 * Gets challenge details from share link ID (for browser page)
 * @param {string} shareLinkId - The share link ID from URL
 * @returns {Promise<object|null>} - Challenge share details
 */
export async function getChallengeShare(shareLinkId) {
    try {
        const { data, error } = await supabase
            .rpc('get_challenge_share', {
                p_share_link_id: shareLinkId
            });

        if (error) throw error;

        if (!data || data.length === 0) {
            return null;
        }

        return data[0];
    } catch (error) {
        console.error('Error getting challenge share:', error);
        return null;
    }
}

/**
 * Auto-joins user to group from challenge share link
 * @param {string} userId - New user's ID
 * @param {string} shareLinkId - Share link ID they clicked
 * @returns {Promise<object|null>} - Group info for navigation
 */
export async function joinFromChallengeShare(userId, shareLinkId) {
    try {
        // Get share details
        const shareDetails = await getChallengeShare(shareLinkId);

        if (!shareDetails || shareDetails.is_expired) {
            Alert.alert('Challenge Expired', 'This challenge link has expired.');
            return null;
        }

        // Check if already in group
        const { data: existing } = await supabase
            .from('app_group_members')
            .select('id')
            .eq('user_id', userId)
            .eq('group_id', shareDetails.group_id)
            .single();

        // Join group if not already a member
        if (!existing) {
            const { error: joinError } = await supabase
                .from('app_group_members')
                .insert({
                    user_id: userId,
                    group_id: shareDetails.group_id
                });

            if (joinError) throw joinError;
        }

        // Return group info for navigation
        return {
            groupId: shareDetails.group_id,
            groupName: shareDetails.group_name,
            challengeMessageId: shareDetails.challenge_message_id
        };
    } catch (error) {
        console.error('Error joining from challenge share:', error);
        Alert.alert('Error', 'Failed to join group. Please try again.');
        return null;
    }
}
