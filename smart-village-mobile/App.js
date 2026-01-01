/**
 * 智慧村庄移动应用主入口
 * React Native App - 支持村民端、村委端、管理端
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 导入导航器
import AppNavigator from './src/navigation/AppNavigator';

// 导入上下文提供者
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

// 导入主题和样式
import { theme } from './src/theme';
import colors from './src/utils/colors';

// 导入工具函数
import { setupDeviceId, checkNetworkStatus } from './src/api';
import { notificationService } from './src/services/notificationService';
import { crashlytics } from './src/utils/crashlytics';

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [networkConnected, setNetworkConnected] = useState(true);
  const [appState, setAppState] = useState('active');

  // 应用初始化
  const initializeApp = useCallback(async () => {
    try {
      console.log('🚀 初始化智慧村庄移动应用...');

      // 设置设备ID
      await setupDeviceId();
      console.log('✅ 设备ID设置完成');

      // 检查网络状态
      const networkStatus = await checkNetworkStatus();
      setNetworkConnected(networkStatus);
      console.log('📡 网络状态检查完成:', networkStatus ? '已连接' : '未连接');

      // 初始化通知服务
      await notificationService.initialize();
      console.log('🔔 通知服务初始化完成');

      // 初始化崩溃分析
      await crashlytics.initialize();
      console.log('💥 崩溃分析初始化完成');

      // 应用就绪
      setIsReady(true);
      console.log('✅ 应用初始化完成');

    } catch (error) {
      console.error('❌ 应用初始化失败:', error);
      // 即使初始化失败也要显示应用，但可以显示错误状态
      setIsReady(true);
    }
  }, []);

  // 应用状态处理
  const handleAppStateChange = useCallback((nextState) => {
    setAppState(nextState);

    if (nextState === 'active') {
      // 应用从后台恢复时执行的操作
      console.log('📱 应用从后台恢复');
      checkNetworkStatus().then(setNetworkConnected);
    } else if (nextState === 'background') {
      // 应用进入后台时执行的操作
      console.log('📱 应用进入后台');
    }
  }, []);

  // 网络状态监听
  const handleNetworkChange = useCallback((isConnected) => {
    setNetworkConnected(isConnected);

    if (isConnected) {
      console.log('📡 网络已连接');
    } else {
      console.log('📡 网络已断开');
    }
  }, []);

  // 组件挂载时执行
  useEffect(() => {
    initializeApp();

    // 监听应用状态变化
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // 清理函数
    return () => {
      appStateSubscription?.remove();
    };
  }, [initializeApp, handleAppStateChange]);

  // 网络状态变化处理
  useEffect(() => {
    const unsubscribe = notificationService.onNetworkChange(handleNetworkChange);

    return unsubscribe;
  }, [handleNetworkChange]);

  // 如果应用还未初始化完成，显示启动屏
  if (!isReady) {
    return (
      <SafeAreaProvider style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.splashContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>智慧村庄</Text>
            <Text style={styles.logoSubtext}>Smart Village</Text>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>正在加载...</Text>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  // 主应用渲染
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={styles.container}>
        <ThemeProvider theme={theme}>
          <PaperProvider theme={theme}>
            <AuthProvider>
              <StatusBar
                barStyle="light-content"
                backgroundColor={colors.primary}
                translucent={false}
              />

              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>

              {/* 网络状态提示 */}
              {!networkConnected && (
                <View style={styles.networkWarning}>
                  <Icon name="wifi-off" size={20} color={colors.white} />
                  <Text style={styles.networkWarningText}>
                    网络连接已断开，部分功能可能无法使用
                  </Text>
                </View>
              )}
            </AuthProvider>
          </PaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  logoSubtext: {
    fontSize: 16,
    color: colors.white + 'CC',
    letterSpacing: 2,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.white,
  },
  networkWarning: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  networkWarningText: {
    fontSize: 14,
    color: colors.white,
    marginLeft: 8,
    flex: 1,
  },
};

export default App;

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // 更新state使下一次渲染能够显示降级后的UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 你同样可以将错误日志上报给服务器
    console.error('React Native Error Boundary捕获到错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 你可以自定义降级后的UI并渲染
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Icon name="error" size={48} color={colors.error} />
            <Text style={styles.errorTitle}>应用出现错误</Text>
            <Text style={styles.errorMessage}>
              {this.state.error?.message || '未知错误'}
            </Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => {
                this.setState({ hasError: false, error: null });
              }}
            >
              <Text style={styles.errorButtonText}>重试</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// 开发模式下显示日志
const enableLogBox = __DEV__;

const AppWithErrorBoundary = () => {
  return (
    <ErrorBoundary>
      {enableLogBox ? (
        <LogBox>
          <App />
        </LogBox>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  );
};

export default AppWithErrorBoundary;