/**
 * 智慧村庄移动端主导航
 * 根据用户角色切换不同的导航结构
 */

import React, { useContext, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

// 认证相关屏幕
import AuthNavigator from './AuthNavigator';
import SplashScreen from '../screens/auth/SplashScreen';

// 村民端屏幕
import VillageHomeScreen from '../screens/village/HomeScreen';
import ProfileScreen from '../screens/village/ProfileScreen';
import ServicesScreen from '../screens/village/ServicesScreen';
import NotificationsScreen from '../screens/village/NotificationsScreen';
import FinanceScreen from '../screens/village/FinanceScreen';
import QRScannerScreen from '../components/household/HouseholdQRScanner';

// 村委端屏幕
import CommitteeHomeScreen from '../screens/committee/HomeScreen';
import ApprovalScreen from '../screens/committee/ApprovalScreen';
import DataCollectionScreen from '../screens/committee/DataCollectionScreen';
import TaskManagementScreen from '../screens/committee/TaskManagementScreen';
import EmergencyScreen from '../screens/committee/EmergencyScreen';

// 管理端屏幕
import DashboardScreen from '../screens/admin/DashboardScreen';
import MonitoringScreen from '../screens/admin/MonitoringScreen';
import StatisticsScreen from '../screens/admin/StatisticsScreen';
import SystemScreen from '../screens/admin/SystemScreen';

import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import colors from '../utils/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

/**
 * 村民端底部导航
 */
const VillageTabNavigator = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Services':
              iconName = 'apps';
              break;
            case 'Finance':
              iconName = 'account-balance-wallet';
              break;
            case 'QRScanner':
              iconName = 'qr-code-scanner';
              break;
            case 'Notifications':
              iconName = 'notifications';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 5,
          paddingTop: 5
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500'
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
          borderBottomColor: theme.colors.border
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold'
        }
      })}
    >
      <Tab.Screen
        name="Home"
        component={VillageHomeScreen}
        options={{ title: '首页' }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{ title: '服务' }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceScreen}
        options={{ title: '财务' }}
      />
      <Tab.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          title: '扫码',
          tabBarButton: (props) => (
            <QRScannerTabButton {...props} />
          )
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: '通知',
          tabBarBadge: user?.unreadNotifications > 0 ? user.unreadNotifications : undefined
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '我的' }}
      />
    </Tab.Navigator>
  );
};

/**
 * 村委端抽屉导航
 */
const CommitteeDrawerNavigator = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: theme.colors.background,
          width: 280
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        headerStyle: {
          backgroundColor: theme.colors.primary,
          borderBottomColor: theme.colors.border
        },
        headerTintColor: '#fff'
      }}
    >
      <Drawer.Screen
        name="CommitteeHome"
        component={CommitteeHomeScreen}
        options={{
          title: '工作台',
          drawerIcon: ({ color, size }) => (
            <Icon name="dashboard" color={color} size={size} />
          )
        }}
      />
      <Drawer.Screen
        name="Approval"
        component={ApprovalScreen}
        options={{
          title: '审批管理',
          drawerIcon: ({ color, size }) => (
            <Icon name="approval" color={color} size={size} />
          )
        }}
      />
      <Drawer.Screen
        name="DataCollection"
        component={DataCollectionScreen}
        options={{
          title: '数据采集',
          drawerIcon: ({ color, size }) => (
            <Icon name="data-usage" color={color} size={size} />
          )
        }}
      />
      <Drawer.Screen
        name="TaskManagement"
        component={TaskManagementScreen}
        options={{
          title: '任务管理',
          drawerIcon: ({ color, size }) => (
            <Icon name="assignment" color={color} size={size} />
          )
        }}
      />
      <Drawer.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{
          title: '应急响应',
          drawerIcon: ({ color, size }) => (
            <Icon name="emergency" color={color} size={size} />
          )
        }}
      />
    </Drawer.Navigator>
  );
};

/**
 * 管理端标签导航
 */
const AdminTabNavigator = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Monitoring':
              iconName = 'monitor-heart';
              break;
            case 'Statistics':
              iconName = 'bar-chart';
              break;
            case 'System':
              iconName = 'settings';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
          borderBottomColor: theme.colors.border
        },
        headerTintColor: '#fff'
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: '总览' }}
      />
      <Tab.Screen
        name="Monitoring"
        component={MonitoringScreen}
        options={{ title: '监控' }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{ title: '统计' }}
      />
      <Tab.Screen
        name="System"
        component={SystemScreen}
        options={{ title: '系统' }}
      />
    </Tab.Navigator>
  );
};

/**
 * QR扫描器中间按钮组件
 */
const QRScannerTabButton = ({ onPress, accessibilityState }) => {
  const { focused } = accessibilityState;

  return (
    <TouchableOpacity
      style={{
        top: -20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: focused ? colors.primaryDark : colors.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
      }}
      onPress={onPress}
    >
      <Icon name="qr-code-scanner" size={28} color="#fff" />
    </TouchableOpacity>
  );
};

/**
 * 主导航器
 */
const AppNavigator = () => {
  const { user, isLoading, isAuthenticated } = useContext(AuthContext);

  // 如果正在加载，显示启动屏
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // 未登录显示认证导航
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            {/* 根据用户角色显示不同的导航 */}
            {user?.role === 'villager' && (
              <Stack.Screen name="VillageApp" component={VillageTabNavigator} />
            )}
            {['village_admin', 'village_secretary', 'accountant', 'population_director'].includes(user?.role) && (
              <Stack.Screen name="CommitteeApp" component={CommitteeDrawerNavigator} />
            )}
            {['super_admin', 'department_head', 'auditor'].includes(user?.role) && (
              <Stack.Screen name="AdminApp" component={AdminTabNavigator} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;