require('dotenv').config(); // 加载 .env

const { Telegraf, Markup } = require('telegraf');
const {
  fetchZones,
  addDNSRecord,
  deleteDNSRecord,
  listDNSRecords,
  updateDNSRecord
} = require('./utils.js');

// 使用 .env 中的 TOKEN 和 ID 列表
const bot = new Telegraf(process.env.BOT_TOKEN);
const sessions = {};
const allowedUsers = process.env.ALLOWED_USERS
  ? process.env.ALLOWED_USERS.split(',').map(id => Number(id.trim()))
  : [];

console.log('✅ Bot 已启动，允许访问的用户 ID:', allowedUsers);

const escapeMarkdownV2 = (text) => {
  return text.replace(/([_`*\[\]()~>#+\-=|{}.!])/g, '\\$1');
};

// 权限验证
bot.use(async (ctx, next) => {
  const chatId = ctx.chat.id;
  if (!allowedUsers.includes(chatId)) {
    return await ctx.reply('抱歉，您没有权限使用此Bot。');
  }
  await next();
});

// /start 命令
bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  sessions[chatId] = {};
  const zones = await fetchZones();
  sessions[chatId].zones = zones;

  const domainList = Object.keys(zones);
  const buttons = domainList.map(domain => Markup.button.callback(domain, `select_${domain}`));

  sessions[chatId].step = 'select_domain';
  await ctx.reply('请选择你要管理的域名：', Markup.inlineKeyboard(buttons, { columns: 1 }));
});

// 选择域名后的操作
bot.action(/^select_(.+)$/, async (ctx) => {
  const chatId = ctx.chat.id;
  const domain = ctx.match[1];

  if (!sessions[chatId]) return await ctx.reply('请先使用 /start 命令重新开始。');

  sessions[chatId].selectedDomain = domain;
  sessions[chatId].step = 'domain_selected';

  await ctx.answerCbQuery();
  await ctx.reply(`你选择了 \`${escapeMarkdownV2(domain)}\`，请选择接下来的操作：`, { 
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      Markup.button.callback('➕ 添加记录', 'add_record'),
      Markup.button.callback('📋 列出所有记录', 'list_records')
    ], { columns: 2 })
  });
});

// 添加记录 
bot.action(['add_record'], async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session || !session.selectedDomain) return await ctx.reply('请先选择域名。');

  session.step = 'awaiting_record_name';

  await ctx.answerCbQuery();
  await ctx.reply(`请输入要添加的记录名称（如 www）：`, {
    parse_mode: 'MarkdownV2'
  });
});

// 处理用户选择的记录类型
bot.action(/^(A|CNAME)$/, async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session) {
    await ctx.answerCbQuery('步骤错误');
    console.log('bot.action(/^(A|CNAME)$/,当前没有进行中的操作，请重新开始。');
    return await ctx.reply('当前没有进行中的操作，请重新开始。');
  }

  const recordType = ctx.callbackQuery.data;
  session.recordType = recordType;

  await ctx.answerCbQuery(); // 通知用户点击成功

  if (session.step === 'awaiting_record_type'){
    session.step = 'awaiting_record_name';
    await ctx.reply(`记录类型已设置为：\`${recordType}\`\n\n请输入要添加的记录名称（如 www）：`, {
      parse_mode: 'MarkdownV2'
    });
  };
});

bot.action('list_records', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session || !session.selectedDomain) return await ctx.reply('请先选择域名。');

  const domain = session.selectedDomain;

  if (!session.zones) {
    return await ctx.reply('会话数据错误，请重新使用 /start。');
  }

  const zoneId = session.zones[domain];
  await ctx.answerCbQuery();

  listDNSRecords(zoneId)
    .then(records => {
      if (records.length === 0) {
        return ctx.reply(`域名 \`${escapeMarkdownV2(domain)}\` 没有任何记录。`, { parse_mode: 'MarkdownV2' });
      }
      const recordList = records.map((record, index) => {
        const name = escapeMarkdownV2(record.name);
        const type = escapeMarkdownV2(record.type);
        const content = escapeMarkdownV2(record.content);
        return `${index + 1}\\) ${name} \\(${type}\\): ${content}`;
      }).join('\n');

      ctx.reply(`域名 \`${escapeMarkdownV2(domain)}\` 的所有记录：\n\`\`\`\n${recordList}\`\`\``, { parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
        Markup.button.callback('➕ 添加记录', 'add_record'),
        Markup.button.callback('✏️ 修改记录', 'modify_records'),
        Markup.button.callback('💣 删除记录', 'delete_records'),
        Markup.button.callback('☁️ 修改代理状态', 'switch_proxy_status')
        ], { columns: 2 })
      });
    })
    .catch(error => {
      console.error('列出记录时出错:', error);
      ctx.reply('列出记录时出错，请稍后再试。');
    });
});

// 修改代理状态
bot.action('switch_proxy_status', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session || !session.selectedDomain) {
    return await ctx.reply('请先选择一个域名。');
  }

  // 获取该域名下的所有记录
  await ctx.answerCbQuery();

  const domain = session.selectedDomain;
  const zoneId = session.zones[domain];

  const records = await listDNSRecords(zoneId); // 假设你有这个方法列出所有记录
  if (records.length === 0) {
    return await ctx.reply('该域名没有任何记录，请先添加记录。', {
      ...Markup.inlineKeyboard([
        Markup.button.callback('➕ 添加记录', 'add_record')
      ], { columns: 1 })
    });
  };

  session.modifyCandidates = records; // 临时保存所有记录
  session.step = 'awaiting_switch_proxy_status_index'; // 进入等待输入序号状态

  // 回复并列出记录按钮
  await ctx.reply(`请选择要\*\*修改代理状态\*\*的记录\\(输入序号\\)：`, {
    parse_mode: 'MarkdownV2'
  });



});

// 删除记录
bot.action('delete_records', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session || !session.selectedDomain) {
    return await ctx.reply('请先选择一个域名。');
  }

  // 获取该域名下的所有记录
  await ctx.answerCbQuery();
  
  const domain = session.selectedDomain;
  const zoneId = session.zones[domain];

  const records = await listDNSRecords(zoneId); // 假设你有这个方法列出所有记录
  if (records.length === 0) {
    return await ctx.reply('该域名没有任何记录，请先添加记录。', {
      ...Markup.inlineKeyboard([
        Markup.button.callback('➕ 添加记录', 'add_record')
      ], { columns: 1 })
    });
  };

  session.deleteCandidates = records; // 临时保存所有记录
  session.step = 'awaiting_delete_index'; // 进入等待输入序号状态

  // 回复并列出记录按钮
  await ctx.reply(`请选择要\*\*删除\*\*的记录\\(输入序号\\)：`, {
    parse_mode: 'MarkdownV2'
  });

});


// 修改记录
bot.action('modify_records', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session || !session.selectedDomain) {
    return await ctx.reply('请先选择一个域名。');
  }

  // 获取该域名下的所有记录
  await ctx.answerCbQuery();
  
  const domain = session.selectedDomain;
  const zoneId = session.zones[domain];

  const records = await listDNSRecords(zoneId); // 假设你有这个方法列出所有记录
  if (records.length === 0) {
    return await ctx.reply('该域名没有任何记录，请先添加记录。', {
      ...Markup.inlineKeyboard([
        Markup.button.callback('➕ 添加记录', 'add_record')
      ], { columns: 1 })
    });
  };
  
  session.modifyCandidates = records; // 临时保存所有记录
  session.step = 'awaiting_modify_index'; // 进入等待输入序号状态
  

  // 回复并列出记录按钮
  await ctx.reply(`请选择要\*\*修改\*\*的记录\\(输入序号\\)：`, {
    parse_mode: 'MarkdownV2'
  });
});


// 是否开启代理以及记录添加确认
bot.action(['proxy_enabled', 'proxy_disabled'], async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session) {
    await ctx.answerCbQuery('当前没有进行中的操作');
    return await ctx.reply('当前没有进行中的操作，请重新开始。');
  }

  const userChoice = ctx.callbackQuery.data; // 'proxy_enabled' 或 'proxy_disabled'
  const proxyEnabled = (userChoice === 'proxy_enabled');

  session.proxyStatus = proxyEnabled;
  session.step = 'ready_to_submit'; // 标记即将提交

  await ctx.answerCbQuery();
  await ctx.reply(`代理状态已设置为：\`${proxyEnabled ? '✅启用' : '❌不启用'}\``, {
    parse_mode: 'MarkdownV2'
  });

  session.step = 'confirm_record'; // 进入确认步骤
  
  await ctx.reply('请确认以下信息是否正确，并选择有误的部分：\n' +
    `📛 记录名称：\`${escapeMarkdownV2(session.recordName)}\`\n` +
    `📄 记录类型：\`${escapeMarkdownV2(session.recordType)}\`\n` +
    `🔗 记录值：\`${escapeMarkdownV2(session.recordValue)}\`\n` +
    `🌐 代理状态：\`${proxyEnabled ? '✅启用' : '❌不启用'}\`\n\n`, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        Markup.button.callback('✅ 确认无误', 'confirm_record_submit'),
        Markup.button.callback('⚠️ 记录名称有误', 'error_record_name'),
        Markup.button.callback('⚠️ 记录值有误', 'error_record_value'),
        Markup.button.callback('⚠️ 代理状态有误', 'error_proxy_status'),
      ], { columns: 1 })
    });
});

// 修改错误的记录名称
bot.action('error_record_name', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session) return await ctx.reply('请先使用 /start 开始操作。');

  session.step = 'eidt_record_name';
  await ctx.answerCbQuery();
  await ctx.reply('请修改记录名称（如www）：', {
    parse_mode: 'MarkdownV2'
  });

});

// 修改错误的记录值
bot.action('error_record_value', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session) return await ctx.reply('请先使用 /start 开始操作。');

  session.recordValue = null;
  session.step = 'edit_record_value';

  await ctx.answerCbQuery();
  await ctx.reply('请重新输入记录值（例如 IP 地址或域名）：');
});

// 修改错误的代理状态
bot.action('error_proxy_status', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session) return await ctx.reply('请先使用 /start 开始操作。');


  await ctx.answerCbQuery('请重新选择代理状态');
  await ctx.reply('请选择是否启用代理：', {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      Markup.button.callback('✅启用代理', 'proxy_enabled'),
      Markup.button.callback('❌不启用代理', 'proxy_disabled')
    ], { columns: 1 })
  });
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session) {
    return await ctx.reply('请先使用 /start 开始操作。');
  }

  // 处理记录名称输入
  if (session.step === 'awaiting_record_name') {
    const recordName = ctx.message.text.trim();

    if (!recordName) {
      return await ctx.reply('记录名称不能为空，请重新输入：');
    }

    // 如果都通过了，保存
    session.recordName = recordName;
    session.step = 'awaiting_record_value'; // 进入下一步，等用户输入记录值

    await ctx.reply(`记录名称已设置为：\`${escapeMarkdownV2(recordName)}\`\n\n请输入记录值\\（比如 IP 地址或者域名\\）：`, {
      parse_mode: 'MarkdownV2'
    });

    return;
  }

  // 处理记录值输入
  if (session.step === 'awaiting_record_value') {
    const recordValue = ctx.message.text.trim();

    if (!recordValue) {
      return await ctx.reply('记录值不能为空，请重新输入：');
    }

    // 自动判断是 A 记录还是 CNAME
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(recordValue)) {
      // 如果记录值是有效的 IP 地址，则自动设置为 A 记录
      session.recordType = 'A';
      await ctx.reply(`🤖已自动检测记录类型，并将类型设置为：\`A\``, {
        parse_mode: 'MarkdownV2'
      });
    } else if (/^[a-zA-Z0-9.-]+$/.test(recordValue)) {
      // 如果记录值符合域名格式，则自动设置为 CNAME 记录
      session.recordType = 'CNAME';
      await ctx.reply(`🤖已自动检测记录类型，并将类型设置为：\`CNAME\``, {
        parse_mode: 'MarkdownV2'
      });
    } else {
      return await ctx.reply('我咋搞不清楚这到底应该是 A 记录还是 CNAME 记录？\n\n你这个记录值有点问题啊😵‍💫。。。\n\n再输入一遍吧. . .');
    }

    session.recordValue = recordValue;

    
    session.step = 'awaiting_proxy_status'; // 进入下一步，等用户选择是否代理
    await ctx.reply(`记录值已设置为：\`${escapeMarkdownV2(recordValue)}\`\n\n请选择是否启用代理：`, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        Markup.button.callback('✅启用代理', 'proxy_enabled'),
        Markup.button.callback('❌不启用代理', 'proxy_disabled')
      ], { columns: 1 })
    });
  };

  // 第一步：修改选择的序号对应的记录
  if (session.step === 'awaiting_modify_index') {
    const index = parseInt(ctx.message.text.trim());
    const records = session.modifyCandidates;

    if (isNaN(index) || index < 1 || index > records.length) {
      return await ctx.reply('❌ 无效的序号，请输入 1 到 ' + records.length + ' 之间的数字。');
    }

    const targetRecord = records[index - 1];
    session.recordToModify = targetRecord;
    session.step = 'awaiting_modify_new_value'; // 下一步：等用户输入新值

    await ctx.reply(
      `你选择修改第 ${index} 条记录：\n` +
      `📛 名称：${targetRecord.name}\n` +
      `📄 类型：${targetRecord.type}\n` +
      `🔗 当前值：${targetRecord.content}\n\n请输入新的记录值：`
    );
    return;
  };

  // 👉 第二步：接收新的记录值
  if (session.step === 'awaiting_modify_new_value') {
    const newValue = ctx.message.text.trim();
    const record = session.recordToModify;
    const domain = session.selectedDomain;
    const zoneId = session.zones[domain];

    // 检查新值是否适合 A 记录或 CNAME 记录
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(newValue)) {
      // 如果新值是有效的 IP 地址，则自动设置为 A 记录
      record.type = 'A';
      await ctx.reply(`🤖 已自动检测记录类型，并将类型设置为：\`A\``, {
        parse_mode: 'MarkdownV2'
      });
    } else if (/^[a-zA-Z0-9.-]+$/.test(newValue)) {
      // 如果新值符合域名格式，则自动设置为 CNAME 记录
      record.type = 'CNAME';
      await ctx.reply(`🤖 已自动检测记录类型，并将类型设置为：\`CNAME\``, {
        parse_mode: 'MarkdownV2'
      });
    } else {
      return await ctx.reply('❌ 无法识别新值的类型，请输入有效的 IP 地址或域名格式。');
    }

    try {
      await updateDNSRecord(zoneId, record.id, {
        type: record.type,
        name: record.name,
        content: newValue,
        ttl: record.ttl,
        proxied: record.proxied
      });

      await ctx.reply('✅ 修改成功！');

      // 格式化成功记录详情
      const successLog = `记录名称: ${record.name}\n记录类型: ${record.type}\n新值: ${newValue}\nTTL: ${record.ttl}\n代理: ${record.proxied ? '启用' : '未启用'}`;

      await ctx.reply(`\`\`\`\n${successLog}\n\`\`\``, {
        parse_mode: 'MarkdownV2'
      });



    } catch (err) {
      console.error('修改失败：', err);
      await ctx.reply('❌ 修改失败，请稍后再试。');
    
      // 如果包含 Cloudflare 错误详情
      if (err.details && Array.isArray(err.details)) {
        const messages = err.details.map((e, i) => {
          const code = e.code ?? '未知代码';
          const message = e.message ?? '未知错误';
          return `#${i + 1}\n代码: ${code}\n信息: ${message}`;
        }).join('\n\n');
    
        // 用 MarkdownV2 代码块格式发给用户
        await ctx.reply(`\`\`\`\n${messages}\n\`\`\``, {
          parse_mode: 'MarkdownV2'
        });
      } else {
        // 如果没有 .details，就显示 err.message
        await ctx.reply(`\`\`\`\n${err.message || '未知错误'}\n\`\`\``, {
          parse_mode: 'MarkdownV2'
        });
      };

    };

    // 清除 session
    delete session.step;
    delete session.recordToModify;
  };

  // 删除记录
  if (session.step === 'awaiting_delete_index') {
    const index = parseInt(ctx.message.text.trim());
    const records = session.deleteCandidates;

    if (isNaN(index) || index < 1 || index > records.length) {
      return await ctx.reply(`❌ 无效的序号，请输入 1 到 ${records.length} 之间的数字。`);
    }

    const targetRecord = records[index - 1];
    session.recordToDelete = targetRecord;
    session.step = 'awaiting_delete_confirm';

    await ctx.reply(
      `⚠️ 你确定要删除以下记录吗？\n\n` +
      `📛 名称：\`${escapeMarkdownV2(targetRecord.name)}\`\n` +
      `📄 类型：\`${escapeMarkdownV2(targetRecord.type)}\`\n` +
      `🔗 值：\`${escapeMarkdownV2(targetRecord.content)}\``,
      {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          Markup.button.callback('✅ 确认删除', 'confirm_delete'),
          Markup.button.callback('❌ 取消', 'cancel_delete')
        ])
      }
    );
  };

  
  // 处理记录名称修改
  if (session.step === 'eidt_record_name') {
    const recordName = ctx.message.text.trim();

    if (!recordName) {
      return await ctx.reply('记录名称不能为空，请重新输入：');
    }

    session.recordName = recordName;
    session.step = 'confirm_record'; // 再次回到主机记录检查步骤
    await ctx.reply(`记录值已设置为：\`${escapeMarkdownV2(recordName)}\`\n\n请确认是否正确：`, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        Markup.button.callback('✅ 确认无误', 'confirm_record_submit'),
        Markup.button.callback('⚠️ 记录名称有误', 'error_record_name'),
        Markup.button.callback('⚠️ 记录值有误', 'error_record_value'),
        Markup.button.callback('⚠️ 代理状态有误', 'error_proxy_status'),
      ], { columns: 1 })
    });
  };

  // 处理记录值修改
  if (session.step === 'edit_record_value') {
    const recordValue = ctx.message.text.trim();

    if (!recordValue) {
      return await ctx.reply('记录值不能为空，请重新输入：');
    }

    // 自动判断是 A 记录还是 CNAME
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(recordValue)) {
      // 如果记录值是有效的 IP 地址，则自动设置为 A 记录
      session.recordType = 'A';
      await ctx.reply(`🤖已自动检测记录类型，并将类型设置为：\`A\``, {
        parse_mode: 'MarkdownV2'
      });
    } else if (/^[a-zA-Z0-9.-]+$/.test(recordValue)) {
      // 如果记录值符合域名格式，则自动设置为 CNAME 记录
      session.recordType = 'CNAME';
      await ctx.reply(`🤖已自动检测记录类型，并将类型设置为：\`CNAME\``, {
        parse_mode: 'MarkdownV2'
      });
    } else {
      return await ctx.reply('我咋搞不清楚这到底应该是 A 记录还是 CNAME 记录？\n\n你这个记录值有点问题啊😵‍💫。。。\n\n再输入一遍吧. . .');
    }

    session.recordValue = recordValue;
    session.step = 'confirm_record'; // 再次回到主机记录检查步骤
    await ctx.reply(`记录值已设置为：\`${escapeMarkdownV2(recordValue)}\`\n\n请确认是否正确：`, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        Markup.button.callback('✅ 确认无误', 'confirm_record_submit'),
        Markup.button.callback('⚠️ 记录名称有误', 'error_record_name'),
        Markup.button.callback('⚠️ 记录值有误', 'error_record_value'),
        Markup.button.callback('⚠️ 代理状态有误', 'error_proxy_status'),
      ], { columns: 1 })
    });
  };

  // 处理代理状态修改
  if (session.step === 'awaiting_switch_proxy_status_index') {
    const index = parseInt(ctx.message.text.trim());
    const records = session.modifyCandidates;
    const domain = session.selectedDomain;
    const zoneId = session.zones[domain];

    if (isNaN(index) || index < 1 || index > records.length) {
      return await ctx.reply('❌ 无效的序号，请输入 1 到 ' + records.length + ' 之间的数字。');
    }

    const record = records[index - 1];
    newproxied = !record.proxied; // 反转当前的代理状态

    try {
      await updateDNSRecord(zoneId, record.id, {
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl,
        proxied: newproxied
      });

      await ctx.reply('✅ 修改成功！');

      // 格式化成功记录详情
      const successLog = `记录名称: ${record.name}\n记录类型: ${record.type}\n新值: ${record.content}\nTTL: ${record.ttl}\n代理: ${newproxied ? '启用' : '未启用'}`;

      await ctx.reply(`\`\`\`\n${successLog}\n\`\`\``, {
        parse_mode: 'MarkdownV2'
      });



    } catch (err) {
      console.error('修改失败：', err);
      await ctx.reply('❌ 修改失败，请稍后再试。');
    
      // 如果包含 Cloudflare 错误详情
      if (err.details && Array.isArray(err.details)) {
        const messages = err.details.map((e, i) => {
          const code = e.code ?? '未知代码';
          const message = e.message ?? '未知错误';
          return `#${i + 1}\n代码: ${code}\n信息: ${message}`;
        }).join('\n\n');
    
        // 用 MarkdownV2 代码块格式发给用户
        await ctx.reply(`\`\`\`\n${messages}\n\`\`\``, {
          parse_mode: 'MarkdownV2'
        });
      } else {
        // 如果没有 .details，就显示 err.message
        await ctx.reply(`\`\`\`\n${err.message || '未知错误'}\n\`\`\``, {
          parse_mode: 'MarkdownV2'
        });
      };

    };
    
    // 清除 session
    delete session.step;
  };
  
});

// 用户确认删除记录
bot.action('confirm_delete', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session || !session.recordToDelete || !session.selectedDomain) {
    return await ctx.reply('⚠️ 无法执行删除操作，请重新开始流程。');
  }

  const zoneId = session.zones[session.selectedDomain];
  const record = session.recordToDelete;

  try {
    // 执行删除操作
    await deleteDNSRecord(zoneId, record.id);

    // 删除成功，显示详细信息
    const recordDetails = `记录名称: ${record.name}\n记录类型: ${record.type}\n记录值: ${record.content}\nTTL: ${record.ttl}\n代理: ${record.proxied ? '启用' : '未启用'}`;
    await ctx.reply('✅ 记录已成功删除！');
    await ctx.reply(`被删除的记录：\`\`\`\n${recordDetails}\n\`\`\``, { parse_mode: 'MarkdownV2' });

  } catch (err) {
    console.error('删除记录失败:', err);
    await ctx.reply('❌ 删除记录失败，请稍后重试。');
    
    // 如果有错误详情
    if (err.details && Array.isArray(err.details)) {
      const errorMessages = err.details.map((e, i) => {
        return `#${i + 1}\n代码: ${e.code}\n信息: ${e.message}`;
      }).join('\n\n');

      await ctx.reply(`\`\`\`\n${errorMessages}\n\`\`\``, { parse_mode: 'MarkdownV2' });
    } else {
      await ctx.reply(`\`\`\`\n${err.message || '未知错误'}\n\`\`\``, { parse_mode: 'MarkdownV2' });
    };


  };
  
  await ctx.answerCbQuery(); // 关闭按钮 loading 状态

  

  // 清除 session
  delete session.step;
  delete session.recordToModify;
});

// 用户取消删除
bot.action('cancel_delete', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  await ctx.reply('❌ 删除操作已取消。');

  await ctx.answerCbQuery();


  // 清除 session
  delete session.step;
  delete session.recordToModify;
});

// 主机记录检查
bot.action('confirm_record', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session) return await ctx.reply('请先使用 /start 开始操作。');

  await ctx.answerCbQuery();
  await ctx.reply(`请确认以下信息是否正确：\n` +
    `📛 记录名称：\`${escapeMarkdownV2(session.recordName)}\`\n` +
    `📄 记录类型：\`${escapeMarkdownV2(session.recordType)}\`\n` +
    `🔗 记录值：\`${escapeMarkdownV2(session.recordValue)}\`\n` +
    `🌐 代理状态：\`${session.proxyStatus ? '✅启用' : '❌不启用'}\`\n\n`, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        Markup.button.callback('✅ 确认无误', 'confirm_record_submit'),
        Markup.button.callback('⚠️ 记录名称有误', 'error_record_name'),
        Markup.button.callback('⚠️ 记录值有误', 'error_record_value'),
        Markup.button.callback('⚠️ 代理状态有误', 'error_proxy_status'),
      ], { columns: 1 })
    });
});

// 提交记录
bot.action('confirm_record_submit', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session) {
    // 如果 session 不存在，提前返回错误信息
    return await ctx.reply('会话已过期，请重新开始操作。');
  }

  session.step = 'ready_to_submit'; // 设置为准备提交

  try {
    // 调用 addDNSRecord 方法提交记录
    const result = await addDNSRecord(
      session.zones[session.selectedDomain], 
      session.recordName, 
      session.recordType, 
      session.recordValue, 
      session.proxyStatus,
      1 // ttl 显式传递
    );

    // 记录成功后
    await ctx.reply('✅ 记录添加成功！');

    // ✅ 返回 Cloudflare 返回的记录内容，格式化为 JSON
    const formatted = JSON.stringify(result, null, 2); // 缩进2格
    await ctx.reply(`\`\`\`json\n${formatted}\n\`\`\``, {
      parse_mode: 'MarkdownV2'
    });
  
    await ctx.answerCbQuery();
    delete sessions[chatId];
  

  } catch (error) {
    // 处理错误，确保 session 被清理
    console.error('添加记录时出错:', error);
    await ctx.answerCbQuery(); // 正确关闭按钮等待状态
    await ctx.reply('❌ 添加记录失败，看看报错吧。');

    // 如果有附带错误详情
    if (error.details && Array.isArray(error.details)) {
      for (const err of error.details) {
        const code = err.code ?? '未知代码';
        const message = err.message ?? '未知错误';

        // 输出错误代码和错误信息，保留Markdown格式
        await ctx.reply(`\`\`\`错误代码：${code}\n错误信息：${message}\`\`\``, { parse_mode: 'MarkdownV2' });
      }
    } else {
      // 如果没有详细错误，用 message
      await ctx.reply(`\`\`\`错误信息：${error.message}\`\`\``, { parse_mode: 'MarkdownV2' });
    }

    delete sessions[chatId]; // 清除会话数据
  }
});




// 启动Bot
bot.launch();
console.log('🤖 Telegram Bot 启动成功');

// 设置命令列表
bot.telegram.setMyCommands([
  { command: 'start', description: '开始使用机器人' }
]);
