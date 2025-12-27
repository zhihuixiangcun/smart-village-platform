/**
 * 村民端财务概览卡片组件
 * 显示财务摘要、收支情况、透明度评分
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';

import colors from '../../utils/colors';
import typography from '../../utils/typography';
import { financeApi } from '../../api/finance';
import { useAuth } from '../../hooks/useAuth';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;

const FinanceOverviewCard = ({ style, onDetailPress }) => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedChart, setExpandedChart] = useState(null);

  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    loadFinanceData();
    animateCard();
  }, []);

  const animateCard = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
  };

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const response = await financeApi.getFinanceSummary(user.villageId);

      if (response.success) {
        setFinanceData(response.data);
      }
    } catch (error) {
      console.error('加载财务数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFinanceData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const getTransparencyColor = (score) => {
    if (score >= 90) return colors.success;
    if (score >= 70) return colors.warning;
    return colors.error;
  };

  const getTransparencyText = (score) => {
    if (score >= 90) return '优秀';
    if (score >= 70) return '良好';
    return '需改进';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Icon name="account-balance-wallet" size={24} color={colors.primary} />
        <Text style={styles.headerTitle}>村级财务概览</Text>
      </View>
      <TouchableOpacity
        style={styles.headerRight}
        onPress={() => navigation.navigate('FinanceDetail')}
      >
        <Text style={styles.viewAllText}>查看详情</Text>
        <Icon name="arrow-forward-ios" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderSummaryCards = () => {
    if (!financeData) return null;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Icon name="trending-up" size={20} color={colors.success} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>总收入</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(financeData.income.totalIncome)}
            </Text>
            <Text style={styles.summaryPeriod}>
              {new Date(financeData.period.startDate).getFullYear()}年度
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, styles.expenseCard]}>
          <View style={[styles.summaryIcon, styles.expenseIcon]}>
            <Icon name="trending-down" size={20} color={colors.error} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>总支出</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(financeData.expense.totalExpense)}
            </Text>
            <Text style={styles.summaryPeriod}>
              {financeData.expense.categories?.length || 0}个类别
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, styles.balanceCard]}>
          <View style={[styles.summaryIcon, styles.balanceIcon]}>
            <Icon name="account-balance" size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>结余</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(financeData.balance)}
            </Text>
            <Text style={[
              styles.summaryPeriod,
              { color: financeData.balance >= 0 ? colors.success : colors.error }
            ]}>
              {financeData.balance >= 0 ? '盈余' : '赤字'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTransparencyScore = () => {
    const score = 85; // 模拟透明度评分

    return (
      <View style={styles.transparencyContainer}>
        <View style={styles.transparencyHeader}>
          <View style={styles.transparencyTitle}>
            <Icon name="verified" size={20} color={getTransparencyColor(score)} />
            <Text style={styles.transparencyTitleText}>财务透明度</Text>
          </View>
          <View style={[styles.transparencyScore, { backgroundColor: getTransparencyColor(score) }]}>
            <Text style={styles.transparencyScoreText}>{score}</Text>
          </View>
        </View>

        <View style={styles.transparencyDetails}>
          <View style={styles.transparencyItem}>
            <Text style={styles.transparencyItemLabel}>数据完整度</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '90%' }]} />
            </View>
            <Text style={styles.transparencyItemValue}>90%</Text>
          </View>

          <View style={styles.transparencyItem}>
            <Text style={styles.transparencyItemLabel}>村民可访问</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '85%' }]} />
            </View>
            <Text style={styles.transparencyItemValue}>85%</Text>
          </View>

          <View style={styles.transparencyItem}>
            <Text style={styles.transparencyItemLabel}>区块链存证</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '75%' }]} />
            </View>
            <Text style={styles.transparencyItemValue}>75%</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderIncomeChart = () => {
    if (!financeData?.income.categories) return null;

    const chartData = financeData.income.categories.slice(0, 5).map((item, index) => ({
      name: item.category.length > 8 ? item.category.substring(0, 8) + '...' : item.category,
      amount: item.amount / 10000, // 转换为万元
      color: colors.chartColors[index % colors.chartColors.length]
    }));

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>收入构成</Text>
          <TouchableOpacity
            onPress={() => setExpandedChart(expandedChart === 'income' ? null : 'income')}
          >
            <Icon
              name={expandedChart === 'income' ? 'expand-less' : 'expand-more'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {expandedChart === 'income' ? (
          <BarChart
            data={{
              labels: chartData.map(item => item.name),
              datasets: [{
                data: chartData.map(item => item.amount)
              }]
            }}
            width={chartWidth}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              decimalSeparator: '.',
              labelColor: colors.text,
              color: () => colors.primary,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: colors.primary
              }
            }}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        ) : (
          <PieChart
            data={chartData}
            width={chartWidth}
            height={180}
            chartConfig={{
              backgroundColor: 'transparent',
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: colors.text,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 10]}
            absolute
          />
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartLegend}>
            {chartData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.name}</Text>
                <Text style={styles.legendAmount}>{formatCurrency(item.amount * 10000)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderExpenseChart = () => {
    if (!financeData?.expense.categories) return null;

    const chartData = financeData.expense.categories.slice(0, 6).map((item, index) => ({
      name: item.category.length > 6 ? item.category.substring(0, 6) + '...' : item.category,
      amount: item.amount / 10000,
      percentage: Math.round((item.amount / financeData.expense.totalExpense) * 100),
      color: colors.chartColors[index % colors.chartColors.length]
    }));

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>支出分布</Text>
          <TouchableOpacity
            onPress={() => setExpandedChart(expandedChart === 'expense' ? null : 'expense')}
          >
            <Icon
              name={expandedChart === 'expense' ? 'expand-less' : 'expand-more'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {expandedChart === 'expense' ? (
          <BarChart
            data={{
              labels: chartData.map(item => item.name),
              datasets: [{
                data: chartData.map(item => item.amount)
              }]
            }}
            width={chartWidth}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              decimalSeparator: '.',
              labelColor: colors.text,
              color: () => colors.error,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: colors.error
              }
            }}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        ) : (
          <View style={styles.expenseSimpleChart}>
            {chartData.map((item, index) => (
              <View key={index} style={styles.expenseBarItem}>
                <View style={styles.expenseBarInfo}>
                  <Text style={styles.expenseBarName}>{item.name}</Text>
                  <Text style={styles.expenseBarPercentage}>{item.percentage}%</Text>
                </View>
                <View style={styles.expenseBarTrack}>
                  <View
                    style={[
                      styles.expenseBarFill,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: item.color
                      }
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.expenseTotal}>
          <Text style={styles.expenseTotalLabel}>总支出</Text>
          <Text style={styles.expenseTotalValue}>
            {formatCurrency(financeData.expense.totalExpense)}
          </Text>
        </View>
      </View>
    );
  };

  const renderRecentTransactions = () => {
    if (!financeData?.recentTransactions) return null;

    return (
      <View style={styles.recentContainer}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>近期交易</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TransactionList')}>
            <Text style={styles.viewAllText}>查看全部</Text>
          </TouchableOpacity>
        </View>

        {financeData.recentTransactions.slice(0, 3).map((transaction, index) => (
          <View key={index} style={styles.transactionItem}>
            <View style={[
              styles.transactionIcon,
              {
                backgroundColor: transaction.type === 'income'
                  ? colors.successLight
                  : colors.errorLight
              }
            ]}>
              <Icon
                name={transaction.type === 'income' ? 'arrow-downward' : 'arrow-upward'}
                size={16}
                color={transaction.type === 'income' ? colors.success : colors.error}
              />
            </View>

            <View style={styles.transactionContent}>
              <Text style={styles.transactionTitle}>{transaction.description}</Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.date).toLocaleDateString('zh-CN')}
              </Text>
            </View>

            <Text style={[
              styles.transactionAmount,
              { color: transaction.type === 'income' ? colors.success : colors.error }
            ]}>
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Icon name="account-balance-wallet" size={40} color={colors.primary} />
          <Text style={styles.loadingText}>加载财务数据...</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[styles.container, style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderSummaryCards()}
        {renderTransparencyScore()}
        {renderIncomeChart()}
        {renderExpenseChart()}
        {renderRecentTransactions()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 16,
    minHeight: 400
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  viewAllText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 14,
    marginRight: 4
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  expenseIcon: {
    backgroundColor: colors.errorLight
  },
  balanceIcon: {
    backgroundColor: colors.primaryLight
  },
  summaryContent: {
    flex: 1
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4
  },
  summaryValue: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2
  },
  summaryPeriod: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10
  },
  transparencyContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  transparencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  transparencyTitle: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  transparencyTitleText: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8
  },
  transparencyScore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center'
  },
  transparencyScoreText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
    fontSize: 12
  },
  transparencyDetails: {
    gap: 12
  },
  transparencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  transparencyItemLabel: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    width: 80
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3
  },
  transparencyItemValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    width: 35,
    textAlign: 'right'
  },
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  chartTitle: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  chartLegend: {
    flexDirection: 'row',
    marginTop: 12
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    minWidth: 80
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  legendText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 11,
    flex: 1
  },
  legendAmount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10
  },
  expenseSimpleChart: {
    gap: 12
  },
  expenseBarItem: {
    gap: 8
  },
  expenseBarInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  expenseBarName: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12
  },
  expenseBarPercentage: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  },
  expenseBarTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden'
  },
  expenseBarFill: {
    height: '100%',
    borderRadius: 3
  },
  expenseTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  expenseTotalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12
  },
  expenseTotalValue: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  recentContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  recentTitle: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  transactionContent: {
    flex: 1
  },
  transactionTitle: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    marginBottom: 2
  },
  transactionDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12
  },
  transactionAmount: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600'
  }
});

export default FinanceOverviewCard;