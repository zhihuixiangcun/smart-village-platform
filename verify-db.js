const DatabaseService = require('./src/database/databaseService');

async function verifyData() {
  try {
    // Initialize database service
    const dbService = new DatabaseService();
    await dbService.init();
    
    console.log('=== SQLite Database Verification ===\n');
    
    // Retrieve and display residents
    const residents = await dbService.getAllResidents();
    console.log('👥 村民数据:');
    residents.forEach(resident => {
      console.log(`  - ${resident.name} (${resident.idCard}) - ${resident.householdType}`);
    });
    
    // Retrieve and display committee members
    const committeeMembers = await dbService.getAllCommitteeMembers();
    console.log('\n🏛️ 村委会成员:');
    committeeMembers.forEach(member => {
      console.log(`  - ${member.name} - ${member.position}`);
    });
    
    // Retrieve and display announcements
    const announcements = await dbService.getAllAnnouncements();
    console.log('\n📢 公告:');
    announcements.forEach(announcement => {
      console.log(`  - ${announcement.title} (优先级: ${announcement.priority})`);
    });
    
    // Retrieve and display financial records
    const finances = await dbService.getAllFinanceRecords();
    console.log('\n💰 财务记录:');
    finances.forEach(finance => {
      console.log(`  - ${finance.type}: ¥${finance.amount} (${finance.category})`);
    });
    
    // Display summary
    console.log('\n📊 数据统计:');
    console.log(`  - 村民: ${residents.length}人`);
    console.log(`  - 村委会成员: ${committeeMembers.length}人`);
    console.log(`  - 公告: ${announcements.length}篇`);
    console.log(`  - 财务记录: ${finances.length}条`);
    
    console.log('\n✅ 数据验证完成!');
    
  } catch (error) {
    console.error('❌ 数据验证失败:', error);
  }
}

verifyData();