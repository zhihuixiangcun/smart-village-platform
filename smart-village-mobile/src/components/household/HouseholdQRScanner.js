import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Linking,
  Share,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { BarCodeScanner } from 'react-native-barcode-scanner';
import { Camera } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { householdApi } from '../api/household';
import { useAuth } from '../hooks/useAuth';
import colors from '../utils/colors';
import typography from '../utils/typography';

const { width, height } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.8;

const HouseholdQRScanner = ({ visible, onClose, onScanSuccess }) => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(true);

  const cameraRef = useRef(null);

  // 检查相机权限
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // 处理二维码扫描
  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || !cameraActive) return;

    setScanned(true);
    Vibration.vibrate(100);

    try {
      setLoading(true);

      // 验证二维码
      const response = await householdApi.verifyQRCode(data);

      if (response.success) {
        const householdData = response.data.household;

        setScanResult({
          success: true,
          data: householdData,
          message: '户一码验证成功'
        });

        // 震动反馈
        Vibration.vibrate([100, 50, 100]);

        // 调用成功回调
        if (onScanSuccess) {
          onScanSuccess(householdData);
        }

        setShowResult(true);
      } else {
        setScanResult({
          success: false,
          error: response.error || '二维码验证失败',
          message: response.message || '无法识别该户一码'
        });

        setShowResult(true);
      }
    } catch (error) {
      console.error('QR Code verification error:', error);
      setScanResult({
        success: false,
        error: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络后重试'
      });
      setShowResult(true);
    } finally {
      setLoading(false);
    }
  };

  // 重新扫描
  const handleRescan = () => {
    setScanned(false);
    setShowResult(false);
    setScanResult(null);
    setCameraActive(true);
  };

  // 分享户一码信息
  const handleShare = async () => {
    if (!scanResult || !scanResult.success) return;

    try {
      const household = scanResult.data;
      const shareMessage = `户一码: ${household.codeId}\n户主: ${household.householder.name}\n住址: ${formatAddress(household.address)}`;

      await Share.share({
        message: shareMessage,
        title: '智慧村庄 - 户一码信息',
        url: `https://smart-village.example.com/household/${household.codeId}`
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('分享失败', '无法分享该户一码信息');
    }
  };

  // 导航到详情页
  const handleViewDetails = () => {
    if (!scanResult || !scanResult.success) return;

    setShowResult(false);
    navigation.navigate('HouseholdDetail', {
      householdId: scanResult.data._id,
      codeId: scanResult.data.codeId
    });
  };

  // 格式化地址
  const formatAddress = (address) => {
    if (!address) return '地址信息不完整';
    const parts = [
      address.province,
      address.city,
      address.county,
      address.township,
      address.village,
      address.detailed
    ].filter(Boolean);
    return parts.join('');
  };

  // 拨打电话
  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;

    Alert.alert(
      '拨打电话',
      `确定要拨打 ${phoneNumber} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '拨打',
          onPress: () => Linking.openURL(`tel:${phoneNumber}`)
        }
      ]
    );
  };

  // 切换手电筒
  const toggleTorch = () => {
    if (cameraRef.current) {
      cameraRef.current.toggleTorch();
      setTorchOn(!torchOn);
    }
  };

  // 如果没有相机权限
  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>正在请求相机权限...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="camera-alt" size={64} color={colors.error} />
        <Text style={styles.errorText}>没有相机权限</Text>
        <Text style={styles.subText}>请在设置中开启相机权限以使用扫码功能</Text>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* 顶部操作栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>扫描户一码</Text>
          <TouchableOpacity
            style={styles.torchBtn}
            onPress={toggleTorch}
            disabled={!cameraRef.current}
          >
            <Icon
              name={torchOn ? "flashlight-on" : "flashlight-off"}
              size={24}
              color={torchOn ? colors.warning : colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* 扫描区域 */}
        <View style={styles.scannerContainer}>
          {!showResult && (
            <BarCodeScanner
              ref={cameraRef}
              onBarCodeScanned={handleBarCodeScanned}
              style={[styles.camera, { height: SCANNER_SIZE }]}
              type={BarCodeScanner.Constants.Type.qr}
              cameraStyle={styles.cameraStyle}
            />
          )}

          {/* 扫描框 */}
          {!showResult && (
            <View style={styles.overlay}>
              <View style={[styles.overlayCorner, { top: 50, left: 50 }]} />
              <View style={[styles.overlayCorner, { top: 50, right: 50, transform: [{ rotate: '90deg' }] }]} />
              <View style={[styles.overlayCorner, { bottom: 50, left: 50, transform: [{ rotate: '-90deg' }] }]} />
              <View style={[styles.overlayCorner, { bottom: 50, right: 50, transform: [{ rotate: '180deg' }] }]} />

              <Text style={styles.scanText}>将二维码放入框内进行扫描</Text>
            </View>
          )}

          {/* 加载指示器 */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>正在验证...</Text>
            </View>
          )}

          {/* 扫描结果 */}
          {showResult && scanResult && (
            <View style={styles.resultContainer}>
              {scanResult.success ? (
                <View style={styles.successResult}>
                  <Icon name="check-circle" size={64} color={colors.success} />
                  <Text style={styles.successTitle}>验证成功</Text>
                  <Text style={styles.successMessage}>{scanResult.message}</Text>

                  {scanResult.data && (
                    <View style={styles.householdInfo}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>户一码:</Text>
                        <Text style={styles.infoValue}>{scanResult.data.codeId}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>户主:</Text>
                        <Text style={styles.infoValue}>{scanResult.data.householder?.name}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>家庭成员:</Text>
                        <Text style={styles.infoValue}>
                          {scanResult.data.totalMembers || scanResult.data.members?.length + 1}人
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>住址:</Text>
                        <Text style={[styles.infoValue, styles.addressText]}>
                          {formatAddress(scanResult.data.address)}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.primaryBtn]}
                      onPress={handleViewDetails}>
                      <Icon name="visibility" size={20} color={colors.white} />
                      <Text style={styles.actionBtnText}>查看详情</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.secondaryBtn]}
                      onPress={handleShare}>
                      <Icon name="share" size={20} color={colors.primary} />
                      <Text style={[styles.actionBtnText, { color: colors.primary }]}>分享</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.secondaryBtn]}
                      onPress={handleRescan}>
                      <Icon name="refresh" size={20} color={colors.primary} />
                      <Text style={[styles.actionBtnText, { color: colors.primary }]}>重新扫描</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 联系电话按钮 */}
                  {scanResult.data?.householder?.phone && (
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCall(scanResult.data.householder.phone)}
                    >
                      <Icon name="phone" size={20} color={colors.white} />
                      <Text style={styles.callBtnText}>
                        拨打 {formatPhone(scanResult.data.householder.phone)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.errorResult}>
                  <Icon name="error" size={64} color={colors.error} />
                  <Text style={styles.errorTitle}>验证失败</Text>
                  <Text style={styles.errorMessage}>{scanResult.message}</Text>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.primaryBtn]}
                    onPress={handleRescan}>
                    <Icon name="refresh" size={20} color={colors.white} />
                    <Text style={styles.actionBtnText}>重新扫描</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 底部提示 */}
        {!showResult && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              支持扫描智慧村庄户一码，请确保二维码清晰可见
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

// 格式化手机号
const formatPhone = (phone) => {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
  },
  torchBtn: {
    padding: 8,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cameraStyle: {
    alignSelf: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
    borderWidth: 3,
  },
  scanText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    ...typography.body,
    color: colors.white,
    marginTop: 16,
  },
  resultContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  successResult: {
    alignItems: 'center',
  },
  successTitle: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  householdInfo: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRow:lastChild: {
    marginBottom: 0,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  addressText: {
    fontSize: 12,
    lineHeight: 16,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 90,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  secondaryBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionBtnText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '500',
    marginLeft: 8,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
  },
  callBtnText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '500',
    marginLeft: 8,
  },
  errorResult: {
    alignItems: 'center',
  },
  errorTitle: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});

export default HouseholdQRScanner;