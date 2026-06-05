const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// ============================================================
//  CẤU HÌNH - Chỉnh sửa theo server của bạn
// ============================================================
const CONFIG = {
  // ID kênh text để bot gửi thông báo ping
  NOTIFY_CHANNEL_ID: process.env.NOTIFY_CHANNEL_ID || "ID_KENH_TEXT_O_DAY",

  // ID các role muốn ping (thêm nhiều role vào mảng)
  PING_ROLES: (process.env.PING_ROLES || "ID_ROLE_1,ID_ROLE_2").split(",").filter(Boolean),

  // Cooldown giữa các lần ping (tính bằng giây) - tránh spam
  COOLDOWN_SECONDS: parseInt(process.env.COOLDOWN_SECONDS || "60"),

  // Tên các voice channel muốn theo dõi (để trống = theo dõi tất cả)
  // Ví dụ: "Chill 🎵,Chơi Game 🎮"
  WATCH_CHANNELS: (process.env.WATCH_CHANNELS || "").split(",").filter(Boolean),

  // Bỏ qua bot khi có bot vào voice
  IGNORE_BOTS: true,
};
// ============================================================

// Lưu thời gian ping lần cuối mỗi voice channel
const lastPingTime = new Map();

// Tin nhắn thông báo
const messages = [
  "chơi game đê mấy con gà",
];

client.once("ready", () => {
  console.log(`✅ Bot đã online: ${client.user.tag}`);
  console.log(`📢 Kênh thông báo: ${CONFIG.NOTIFY_CHANNEL_ID}`);
  console.log(`🎭 Roles ping: ${CONFIG.PING_ROLES.join(", ")}`);
  console.log(`⏱️  Cooldown: ${CONFIG.COOLDOWN_SECONDS}s`);
  client.user.setActivity("voice channels 👀", { type: 3 });
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    // Bỏ qua nếu không phải vào kênh mới (chỉ di chuyển hoặc rời)
    if (!newState.channelId) return;
    if (oldState.channelId === newState.channelId) return;

    const member = newState.member;
    if (!member) return;

    // Bỏ qua bot nếu được cấu hình
    if (CONFIG.IGNORE_BOTS && member.user.bot) return;

    const voiceChannel = newState.channel;
    if (!voiceChannel) return;

    // Kiểm tra nếu chỉ theo dõi một số kênh cụ thể
    if (
      CONFIG.WATCH_CHANNELS.length > 0 &&
      !CONFIG.WATCH_CHANNELS.some((name) =>
        voiceChannel.name.toLowerCase().includes(name.toLowerCase())
      )
    ) {
      return;
    }

    // Kiểm tra cooldown
    const now = Date.now();
    const lastPing = lastPingTime.get(voiceChannel.id) || 0;
    const cooldownMs = CONFIG.COOLDOWN_SECONDS * 1000;

    if (now - lastPing < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (now - lastPing)) / 1000);
      console.log(`⏳ Cooldown còn ${remaining}s cho kênh: ${voiceChannel.name}`);
      return;
    }

    // Lấy kênh text để gửi thông báo
    const notifyChannel = await client.channels
      .fetch(CONFIG.NOTIFY_CHANNEL_ID)
      .catch(() => null);

    if (!notifyChannel) {
      console.error("❌ Không tìm thấy kênh text thông báo!");
      return;
    }

    // Tạo mentions cho các role
    const roleMentions = CONFIG.PING_ROLES.map((id) => `<@&${id.trim()}>`).join(" ");

    // Chọn tin nhắn ngẫu nhiên
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];

    // Tạo embed đẹp
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🔊 Có người trong Voice!")
      .setDescription(
        `**${member.displayName}** vừa vào **${voiceChannel.name}**\n${randomMsg}`
      )
      .addFields(
        {
          name: "📍 Kênh Voice",
          value: `[${voiceChannel.name}](https://discord.com/channels/${newState.guild.id}/${voiceChannel.id})`,
          inline: true,
        },
        {
          name: "👥 Số người",
          value: `${voiceChannel.members.size} người`,
          inline: true,
        }
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: "Voice Notifier Bot 🤖" });

    // Gửi thông báo
    await notifyChannel.send({
      content: roleMentions,
      embeds: [embed],
    });

    // Cập nhật thời gian ping
    lastPingTime.set(voiceChannel.id, now);

    console.log(
      `✅ Đã ping cho kênh "${voiceChannel.name}" | Member: ${member.displayName}`
    );
  } catch (error) {
    console.error("❌ Lỗi voiceStateUpdate:", error);
  }
});

// Xử lý lỗi không mong muốn
client.on("error", (error) => console.error("❌ Discord Client Error:", error));
process.on("unhandledRejection", (error) => console.error("❌ Unhandled Rejection:", error));

// Đăng nhập bot
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ Thiếu DISCORD_TOKEN trong biến môi trường!");
  process.exit(1);
}

client.login(token);
