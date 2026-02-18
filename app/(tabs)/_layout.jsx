import { Tabs } from 'expo-router';
import { FeedLayout } from '../../components/FeedLayout';
import { FeedProvider } from '../../contexts/FeedContext';

// One big feed: no bottom nav. Layout = header (avatar, name, level) + [ sidebar | main ].
// Main = Language Soup (one challenge, all responses with language tags) or selected group chat.
export default function TabLayout() {
    return (
        <FeedProvider>
            <FeedLayout>
                <Tabs
                initialRouteName="feed"
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { display: 'none', height: 0 },
                }}
            >
                <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
                <Tabs.Screen name="community" options={{ href: null }} />
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="profile" options={{ href: null }} />
                <Tabs.Screen name="support" options={{ href: null }} />
            </Tabs>
            </FeedLayout>
        </FeedProvider>
    );
}
