const { API_TOKEN } = require('./config');
const readline = require('readline');
const BASE_URL = 'https://api.cloudflare.com/client/v4';

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 将 rl.question 封装为 Promise
function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// 关闭 readline 接口
function closeReadline() {
  rl.close();
}

// 获取根域名
function getRootDomain(domain) {
  const parts = domain.split('.');
  return parts.slice(-2).join('.');
}

// 获取所有 Zone 列表
async function fetchZones() {
  const res = await fetch(`${BASE_URL}/zones`, {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  if (!data.success) throw new Error('获取 Zone 列表失败');
  const zoneMap = {};
  data.result.forEach(zone => {
    zoneMap[zone.name] = zone.id;
  });
  return zoneMap;
}

// 获取指定 Zone 的所有 DNS 记录
async function listDNSRecords(zoneId) {
  const url = `${BASE_URL}/zones/${zoneId}/dns_records`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('调试数据: ', JSON.stringify(data.result, null, 2));
  if (data.success) {
    // 只返回正向 DNS 记录，并提取所需字段
    return data.result
      .filter(record => record.type === 'A' || record.type === 'CNAME')
      .map(record => ({
        name: record.name,
        type: record.type,
        content: record.content
      }));
  } else {
    console.error('❌ 查询失败:');
    console.error(data.errors);
    return [];
  }
}

// 添加 DNS 记录
async function addDNSRecord(zoneId, name, type, content, proxied = false, ttl = 1) {
  const url = `${BASE_URL}/zones/${zoneId}/dns_records`;
  const payload = { type, name, content, ttl, proxied };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!data.success) {
    console.error('❌ 添加DNS记录失败:', data.errors);

    // 抛出一个带上 Cloudflare 错误信息的对象
    const error = new Error('添加DNS记录失败');
    error.details = data.errors;
    throw error;
  }

  console.log('✅ DNS记录添加成功:');
  console.log(JSON.stringify(data.result, null, 2));
  return data.result;
}

// 修改 DNS 记录
async function updateDNSRecord(zoneId, recordId, newData) {
  const url = `${BASE_URL}/zones/${zoneId}/dns_records/${recordId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newData)
  });

  const data = await response.json();

  if (!data.success) {
    console.error('❌ 修改DNS记录失败:', data.errors);

    // 抛出包含错误详情的异常
    const error = new Error('修改DNS记录失败');
    error.details = data.errors;
    throw error;
  }

  console.log('✅ DNS记录修改成功:', data.result);
  return data.result;
}


// 列出zoneid内的所有dns记录
async function listDNSRecords(zoneId) {
  const url = `${BASE_URL}/zones/${zoneId}/dns_records`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (data.success) {
    return data.result;
  } else {
    console.error('❌ 查询失败:');
    console.error(data.errors);
    return [];
  }
}


// 删除 DNS 记录
async function deleteDNSRecord(zoneId, recordId) {
  const url = `${BASE_URL}/zones/${zoneId}/dns_records/${recordId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (data.success) {
    //console.log(JSON.stringify(data.result, null, 2));
    console.log('✅ DNS 记录删除成功！');
  } else {
    console.error('❌ 删除失败:');
    console.error(data.errors);
  }
}

// 获取指定 Zone 的所有 DNS 记录
async function getDNSRecords(zoneId) {
  const url = `${BASE_URL}/zones/${zoneId}/dns_records`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (data.success) {
    return data.result;
  } else {
    console.error('❌ 查询失败:');
    console.error(data.errors);
    return [];
  }
}

// 获取指定子域名的 DNS 记录
async function getSubdomainRecords(domainName) {
  const rootDomain = getRootDomain(domainName);
  const zoneMap = await fetchZones();
  const zoneId = zoneMap[rootDomain];
  if (!zoneId) {
    console.error(`❌ 找不到 "${rootDomain}" 的 Zone ID`);
    return [];
  }

  const records = await getDNSRecords(zoneId);
  const subdomainRecords = records.filter(record => record.name.endsWith(domainName));
  subdomainRecords.forEach(record => {
    console.log(`记录 ID: ${record.id}`);
    console.log(`类型: ${record.type}`);
    console.log(`名称: ${record.name}`);
    console.log(`内容: ${record.content}`);
    console.log('-----------------------------');
  });
  return subdomainRecords;
}

async function checkDNSRecordExists(domainName) {
  try {
    // 获取所有 Zones
    const zoneMap = await fetchZones();
    const rootDomain = domainName.split('.').slice(-2).join('.');  // 获取根域名
    const zoneId = zoneMap[rootDomain];

    if (!zoneId) {
      console.log(`❌ 未找到域名 "${rootDomain}" 对应的 Zone ID`);
      return;
    }

    // 获取该 Zone 下所有的 DNS 记录
    const records = await getDNSRecords(zoneId);

    // 检查 DNS 记录是否已存在
    const existingRecord = records.find(record => record.name === domainName);

    if (existingRecord) {
      console.log(`✅ 记录已存在：`);
      console.log(`记录 ID: ${existingRecord.id}`);
      console.log(`类型: ${existingRecord.type}`);
      console.log(`名称: ${existingRecord.name}`);
      console.log(`内容: ${existingRecord.content}`);
    } else {
      console.log(`❌ 记录 "${domainName}" 不存在。`);
    }

  } catch (error) {
    console.error("❌ 查询 DNS 记录失败:", error);
  }
}

// 导出模块
module.exports = {
  listDNSRecords,
  askQuestion,
  closeReadline,
  checkDNSRecordExists,
  fetchZones,
  addDNSRecord,
  deleteDNSRecord,
  getDNSRecords,
  getSubdomainRecords,
  getRootDomain,
  updateDNSRecord
};
