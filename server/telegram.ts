
import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = '8164694887:AAG-wUeBvsQbh3kmo0ooIn7FwZKnf3trXYw';
const MAIN_ADMIN_USERNAME = 'MO2025_PROGRAMER';

export const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_bot: boolean;
  uid: string; // فريد لكل مستخدم
}

export interface UserData {
  telegramId: number;
  uid: string;
  firstName: string;
  lastName?: string;
  username?: string;
  isAdmin: boolean;
  isMainAdmin: boolean;
  friends: string[]; // UIDs of friends
  friendRequests: string[]; // UIDs of pending friend requests
  studySessions: StudySession[];
  createdAt: Date;
}

export interface StudySession {
  id: string;
  subject: string;
  topic: string;
  date: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  notes?: string;
}

// تخزين بيانات المستخدمين في الذاكرة (يمكن استبدال هذا بقاعدة بيانات)
const users = new Map<number, UserData>();
const usersByUid = new Map<string, UserData>();
const admins = new Set<number>();

// إضافة المشرف الأساسي
admins.add(123456789); // يجب استبداله بـ Telegram ID الفعلي للمشرف الأساسي

// Bot event handlers
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  
  if (msg.text === '/start') {
    bot.sendMessage(chatId, 'مرحباً بك في منصة طلاب الجامعة! 📚\n\nاستخدم Web App للوصول إلى جميع الميزات.');
  }
});

// Notification functions
export async function sendFileNotification(fileName: string, subject: string) {
  const message = `📁 تم إضافة ملف جديد!\n\n📚 المادة: ${subject}\n📄 اسم الملف: ${fileName}`;
  
  for (const [telegramId] of users) {
    try {
      await bot.sendMessage(telegramId, message);
    } catch (error) {
      console.error(`Failed to send notification to user ${telegramId}:`, error);
    }
  }
}

export async function sendStudyReminder(telegramId: number, session: StudySession, type: 'start' | 'end') {
  const message = type === 'start' 
    ? `⏰ تذكير: سيبدأ وقت مذاكرة ${session.subject} خلال 5 دقائق!\n📖 الموضوع: ${session.topic}`
    : `⏰ تذكير: سينتهي وقت مذاكرة ${session.subject} خلال 5 دقائق!\n📖 الموضوع: ${session.topic}`;
  
  try {
    await bot.sendMessage(telegramId, message);
  } catch (error) {
    console.error(`Failed to send study reminder to user ${telegramId}:`, error);
  }
}

export async function sendExamReminder(telegramId: number, examName: string, examDate: string) {
  const message = `🚨 تذكير: اختبار ${examName} سيكون غداً!\n📅 التاريخ: ${examDate}\n\nحظاً موفقاً! 💪`;
  
  try {
    await bot.sendMessage(telegramId, message);
  } catch (error) {
    console.error(`Failed to send exam reminder to user ${telegramId}:`, error);
  }
}

// Schedule system for reminders
function scheduleStudyReminders() {
  setInterval(() => {
    const now = new Date();
    
    for (const [telegramId, userData] of users) {
      for (const session of userData.studySessions) {
        if (session.completed) continue;
        
        const sessionDate = new Date(session.date);
        const [startHour, startMinute] = session.startTime.split(':').map(Number);
        const [endHour, endMinute] = session.endTime.split(':').map(Number);
        
        const startTime = new Date(sessionDate);
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date(sessionDate);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        // تذكير قبل البداية بـ 5 دقائق
        const startReminder = new Date(startTime.getTime() - 5 * 60 * 1000);
        if (Math.abs(now.getTime() - startReminder.getTime()) < 30000) { // ضمن 30 ثانية
          sendStudyReminder(telegramId, session, 'start');
        }
        
        // تذكير قبل النهاية بـ 5 دقائق
        const endReminder = new Date(endTime.getTime() - 5 * 60 * 1000);
        if (Math.abs(now.getTime() - endReminder.getTime()) < 30000) { // ضمن 30 ثانية
          sendStudyReminder(telegramId, session, 'end');
        }
      }
    }
  }, 30000); // فحص كل 30 ثانية
}

// Schedule exam reminders (check daily)
function scheduleExamReminders() {
  setInterval(async () => {
    try {
      // جلب الاختبارات من قاعدة البيانات
      const response = await fetch('http://localhost:5000/api/exams');
      if (!response.ok) return;
      
      const exams = await response.json();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      for (const exam of exams) {
        const examDate = new Date(exam.date);
        
        // إذا كان الاختبار غداً
        if (examDate.toDateString() === tomorrow.toDateString()) {
          for (const [telegramId] of users) {
            await sendExamReminder(telegramId, exam.subject, exam.date);
          }
        }
      }
    } catch (error) {
      console.error('Error checking exam reminders:', error);
    }
  }, 24 * 60 * 60 * 1000); // فحص يومي
}

// Start reminder systems
scheduleStudyReminders();
scheduleExamReminders();

export function generateUID(): string {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

export function validateTelegramWebAppData(initData: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      return null;
    }

    const userParam = urlParams.get('user');
    if (!userParam) {
      return null;
    }

    const user = JSON.parse(userParam) as TelegramUser;

    // إنشاء UID فريد للمستخدم إذا لم يكن موجوداً
    if (!users.has(user.id)) {
      const uid = user.id.toString(); // استخدام معرف تليجرام كمعرف فريد
      const userData: UserData = {
        telegramId: user.id,
        uid,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        isAdmin: admins.has(user.id),
        isMainAdmin: user.username === MAIN_ADMIN_USERNAME,
        friends: [],
        friendRequests: [],
        studySessions: [],
        createdAt: new Date()
      };

      users.set(user.id, userData);
      usersByUid.set(uid, userData);

      // إضافة المشرف الأساسي تلقائياً
      if (user.username === MAIN_ADMIN_USERNAME) {
        admins.add(user.id);
        userData.isAdmin = true;
        userData.isMainAdmin = true;
      }
    }

    return { ...user, uid: users.get(user.id)!.uid };
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return null;
  }
}

export function getUserData(telegramId: number): UserData | undefined {
  return users.get(telegramId);
}

export function getUserByUid(uid: string): UserData | undefined {
  return usersByUid.get(uid);
}

export function addFriend(userTelegramId: number, friendUid: string): boolean {
  return sendFriendRequest(userTelegramId, friendUid);
}

export function sendFriendRequest(userTelegramId: number, friendUid: string): boolean {
  const user = users.get(userTelegramId);
  const friend = usersByUid.get(friendUid);

  if (!user || !friend || user.uid === friendUid) {
    return false;
  }

  // Check if already friends
  if (user.friends.includes(friendUid)) {
    return false;
  }

  // Check if request already sent
  if (friend.friendRequests.includes(user.uid)) {
    return false;
  }

  // Send friend request
  friend.friendRequests.push(user.uid);
  return true;
}

export function acceptFriendRequest(userTelegramId: number, requesterUid: string): boolean {
  const user = users.get(userTelegramId);
  const requester = usersByUid.get(requesterUid);

  if (!user || !requester) {
    return false;
  }

  // Check if request exists
  const requestIndex = user.friendRequests.indexOf(requesterUid);
  if (requestIndex === -1) {
    return false;
  }

  // Remove from requests and add as friend
  user.friendRequests.splice(requestIndex, 1);
  user.friends.push(requesterUid);
  requester.friends.push(user.uid);

  return true;
}

export function rejectFriendRequest(userTelegramId: number, requesterUid: string): boolean {
  const user = users.get(userTelegramId);

  if (!user) {
    return false;
  }

  const requestIndex = user.friendRequests.indexOf(requesterUid);
  if (requestIndex === -1) {
    return false;
  }

  user.friendRequests.splice(requestIndex, 1);
  return true;
}

export function getFriendRequests(userTelegramId: number): any[] {
  const user = users.get(userTelegramId);
  if (!user) {
    return [];
  }

  return user.friendRequests.map(uid => {
    const requester = usersByUid.get(uid);
    return requester ? {
      uid: requester.uid,
      firstName: requester.firstName,
      lastName: requester.lastName,
      username: requester.username
    } : null;
  }).filter(Boolean);
}

export function addAdmin(mainAdminTelegramId: number, newAdminTelegramId: number): boolean {
  const mainAdmin = users.get(mainAdminTelegramId);

  if (!mainAdmin || !mainAdmin.isMainAdmin) {
    return false;
  }

  admins.add(newAdminTelegramId);
  const newAdmin = users.get(newAdminTelegramId);
  if (newAdmin) {
    newAdmin.isAdmin = true;
  }

  return true;
}

export function isAdmin(telegramId: number): boolean {
  return admins.has(telegramId);
}

export function isMainAdmin(telegramId: number): boolean {
  const user = users.get(telegramId);
  return user?.isMainAdmin || false;
}

export function getAllUsers(): UserData[] {
  return Array.from(users.values());
}

export function updateStudySessions(telegramId: number, sessions: StudySession[]): boolean {
  const user = users.get(telegramId);
  if (!user) {
    return false;
  }

  user.studySessions = sessions;
  return true;
}

export function getFriendStudySessions(userTelegramId: number, friendUid: string): StudySession[] | null {
  const user = users.get(userTelegramId);
  const friend = usersByUid.get(friendUid);

  if (!user || !friend || !user.friends.includes(friendUid)) {
    return null;
  }

  return friend.studySessions;
}
