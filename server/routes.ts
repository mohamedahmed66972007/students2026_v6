import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  insertFileSchema,
  insertExamWeekSchema,
  insertExamSchema,
  insertQuizSchema,
  insertQuizAttemptSchema
} from "@shared/schema";
import {
  validateTelegramWebAppData,
  getUserData,
  getUserByUid,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  addAdmin,
  isAdmin,
  isMainAdmin,
  getAllUsers,
  updateStudySessions,
  getFriendStudySessions,
  StudySession,
  sendFileNotification
} from "./telegram";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware للتحقق من Telegram authentication
function requireTelegramAuth(req: Request, res: Response, next: any) {
  const initData = req.headers['x-telegram-init-data'] as string;

  if (!initData) {
    return res.status(401).json({ message: "Telegram authentication required" });
  }

  const user = validateTelegramWebAppData(initData);
  if (!user) {
    return res.status(401).json({ message: "Invalid Telegram authentication" });
  }

  req.telegramUser = user;
  next();
}

// Middleware للتحقق من صلاحيات المشرف
function requireAdmin(req: Request, res: Response, next: any) {
  if (!req.telegramUser || !isAdmin(req.telegramUser.id)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Middleware للتحقق من صلاحيات المشرف الأساسي
function requireMainAdmin(req: Request, res: Response, next: any) {
  if (!req.telegramUser || !isMainAdmin(req.telegramUser.id)) {
    return res.status(403).json({ message: "Main admin access required" });
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      telegramUser?: any;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // Telegram Auth Routes
  app.post("/api/telegram/validate", async (req: Request, res: Response) => {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ message: "Init data required" });
    }

    const user = validateTelegramWebAppData(initData);
    if (!user) {
      return res.status(401).json({ message: "Invalid Telegram data" });
    }

    const userData = getUserData(user.id);
    res.json({
      user: {
        ...user,
        isAdmin: isAdmin(user.id),
        isMainAdmin: isMainAdmin(user.id),
        uid: userData?.uid
      }
    });
  });

  // User Routes
  app.get("/api/user/profile", requireTelegramAuth, async (req: Request, res: Response) => {
    const userData = getUserData(req.telegramUser.id);
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(userData);
  });

  // Friends Routes
  // إرسال طلب صداقة
  app.post('/api/friends/request', (req: Request, res: Response) => {
    const initData = req.headers['x-telegram-init-data'] as string;
    if (!initData) {
      return res.status(401).json({ message: 'Telegram authentication required' });
    }
    const user = validateTelegramWebAppData(initData);
    if (!user) {
      return res.status(401).json({ message: 'Telegram authentication required' });
    }

    const { friendUid } = req.body;
    const success = sendFriendRequest(user.id, friendUid);

    if (success) {
      res.json({ message: 'Friend request sent successfully' });
    } else {
      res.status(400).json({ message: 'Failed to send friend request' });
    }
  });

  // قبول طلب صداقة
  app.post('/api/friends/accept', (req: Request, res: Response) => {
    const initData = req.headers['x-telegram-init-data'] as string;
    if (!initData) {
      return res.status(401).json({ message: 'Telegram authentication required' });
    }
    const user = validateTelegramWebAppData(initData);
    if (!user) {
      return res.status(401).json({ message: 'Telegram authentication required' });
    }

    const { requesterUid } = req.body;
    const success = acceptFriendRequest(user.id, requesterUid);

    if (success) {
      res.json({ message: 'Friend request accepted' });
    } else {
      res.status(400).json({ message: 'Failed to accept friend request' });
    }
  });

  // رفض طلب صداقة
  app.post('/api/friends/reject', (req: Request, res: Response) => {
    const initData = req.headers['x-telegram-init-data'] as string;
    if (!initData) {
      return res.status(401).json({ message: 'Telegram authentication required' });
    }
    const user = validateTelegramWebAppData(initData);
    if (!user) {
      return res.status(401).json({ message: 'Telegram authentication required' });
    }

    const { requesterUid } = req.body;
    const success = rejectFriendRequest(user.id, requesterUid);

    if (success) {
      res.json({ message: 'Friend request rejected' });
    } else {
      res.status(400).json({ message: 'Failed to reject friend request' });
    }
  });

  // جلب طلبات الصداقة
  app.get('/api/friends/requests', (req: Request, res: Response) => {
    const initData = req.headers['x-telegram-init-data'] as string;
    if (!initData) {
      return res.status(401).json({ message: 'Telegram authentication required' });
    }
    const user = validateTelegramWebAppData(initData);
    if (!user) {
      return res.status(401).json({ message: 'Telegram authentication required' });
    }

    const requests = getFriendRequests(user.id);
    res.json(requests);
  });

  app.get("/api/friends", requireTelegramAuth, async (req: Request, res: Response) => {
    const userData = getUserData(req.telegramUser.id);
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    const friends = userData.friends.map(friendUid => {
      const friend = getUserByUid(friendUid);
      return friend ? {
        uid: friend.uid,
        firstName: friend.firstName,
        lastName: friend.lastName,
        username: friend.username
      } : null;
    }).filter(Boolean);

    res.json(friends);
  });

  app.get("/api/friends/:uid/schedule", requireTelegramAuth, async (req: Request, res: Response) => {
    const { uid } = req.params;
    const sessions = getFriendStudySessions(req.telegramUser.id, uid);

    if (sessions === null) {
      return res.status(403).json({ message: "Cannot access friend's schedule" });
    }

    res.json(sessions);
  });

  // Study Sessions Routes
  app.get("/api/study-sessions", requireTelegramAuth, async (req: Request, res: Response) => {
    const userData = getUserData(req.telegramUser.id);
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(userData.studySessions);
  });

  app.post("/api/study-sessions", requireTelegramAuth, async (req: Request, res: Response) => {
    const sessions: StudySession[] = req.body;
    const success = updateStudySessions(req.telegramUser.id, sessions);

    if (success) {
      res.json({ message: "Study sessions updated successfully" });
    } else {
      res.status(400).json({ message: "Failed to update study sessions" });
    }
  });

  // Admin Routes
  app.post("/api/admin/add", requireMainAdmin, async (req: Request, res: Response) => {
    const { telegramId } = req.body;

    if (!telegramId) {
      return res.status(400).json({ message: "Telegram ID required" });
    }

    const success = addAdmin(req.telegramUser.id, telegramId);
    if (success) {
      res.json({ message: "Admin added successfully" });
    } else {
      res.status(400).json({ message: "Failed to add admin" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    const users = getAllUsers();
    res.json(users);
  });

  // File Routes
  app.get("/api/files", requireTelegramAuth, async (req: Request, res: Response) => {
    try {
      const subject = req.query.subject as string | undefined;
      const semester = req.query.semester as string | undefined;

      let files = await storage.getFiles();

      if (subject && subject !== "all") {
        files = files.filter(file => file.subject === subject);
      }

      if (semester && semester !== "all") {
        files = files.filter(file => file.semester === semester);
      }

      res.json(files);
    } catch (error) {
      console.error("Error getting files:", error);
      res.status(500).json({ message: "Failed to get files" });
    }
  });

  app.get("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getFile(id);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(file);
    } catch (error) {
      console.error("Error getting file:", error);
      res.status(500).json({ message: "Failed to get file" });
    }
  });

  app.post("/api/files", requireAdmin, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("File upload request:", {
        title: req.body.title,
        subject: req.body.subject,
        semester: req.body.semester,
        fileName: req.file.originalname
      });

      const fileData = {
        title: req.body.title,
        subject: req.body.subject,
        semester: req.body.semester,
        fileName: req.file.originalname,
        filePath: ""  // Will be set in the storage implementation
      };

      // Create file with proper validation
      const parseResult = insertFileSchema.safeParse({
        title: req.body.title,
        subject: req.body.subject,
        semester: req.body.semester,
        fileName: req.file.originalname,
        filePath: `/uploads/${req.file.originalname}`
      });

      if (!parseResult.success) {
        console.error("Validation error:", parseResult.error);
        return res.status(400).json({ 
          message: "Invalid file data", 
          errors: parseResult.error.errors 
        });
      }

      // Create file entry in storage
      const file = await storage.createFile(
        parseResult.data,
        req.file.buffer
      );

      // Send notification to all users
      await sendFileNotification(req.file.originalname, req.body.subject);

      res.status(201).json(file);
    } catch (error) {
      console.error("Error creating file:", error);
      res.status(500).json({ message: "Failed to create file" });
    }
  });

  app.delete("/api/files/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFile(id);

      if (!deleted) {
        return res.status(404).json({ message: "File not found" });
      }

      res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Exam Week Routes
  app.get("/api/exam-weeks", requireTelegramAuth, async (_req: Request, res: Response) => {
    try {
      const examWeeks = await storage.getExamWeeks();
      res.json(examWeeks);
    } catch (error) {
      console.error("Error getting exam weeks:", error);
      res.status(500).json({ message: "Failed to get exam weeks" });
    }
  });

  app.post("/api/exam-weeks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parseResult = insertExamWeekSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid exam week data", 
          errors: parseResult.error.errors 
        });
      }

      const examWeek = await storage.createExamWeek(parseResult.data);
      res.status(201).json(examWeek);
    } catch (error) {
      console.error("Error creating exam week:", error);
      res.status(500).json({ message: "Failed to create exam week" });
    }
  });

  app.delete("/api/exam-weeks/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteExamWeek(id);

      if (!deleted) {
        return res.status(404).json({ message: "Exam week not found" });
      }

      res.status(200).json({ message: "Exam week deleted successfully" });
    } catch (error) {
      console.error("Error deleting exam week:", error);
      res.status(500).json({ message: "Failed to delete exam week" });
    }
  });

  // Exam Routes
  app.get("/api/exams", async (req: Request, res: Response) => {
    try {
      const weekId = req.query.weekId ? parseInt(req.query.weekId as string) : undefined;

      let exams;
      if (weekId) {
        exams = await storage.getExamsByWeek(weekId);
      } else {
        exams = await storage.getExams();
      }

      res.json(exams);
    } catch (error) {
      console.error("Error getting exams:", error);
      res.status(500).json({ message: "Failed to get exams" });
    }
  });

  app.post("/api/exams", async (req: Request, res: Response) => {
    try {
      const parseResult = insertExamSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid exam data", 
          errors: parseResult.error.errors 
        });
      }

      const exam = await storage.createExam(parseResult.data);
      res.status(201).json(exam);
    } catch (error) {
      console.error("Error creating exam:", error);
      res.status(500).json({ message: "Failed to create exam" });
    }
  });

  app.delete("/api/exams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteExam(id);

      if (!deleted) {
        return res.status(404).json({ message: "Exam not found" });
      }

      res.status(200).json({ message: "Exam deleted successfully" });
    } catch (error) {
      console.error("Error deleting exam:", error);
      res.status(500).json({ message: "Failed to delete exam" });
    }
  });

  // Quiz Routes
  app.get("/api/quizzes", async (_req: Request, res: Response) => {
    try {
      const quizzes = await storage.getQuizzes();
      res.json(quizzes);
    } catch (error) {
      console.error("Error getting quizzes:", error);
      res.status(500).json({ message: "Failed to get quizzes" });
    }
  });

  app.get("/api/quizzes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const quiz = await storage.getQuiz(id);

      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      res.json(quiz);
    } catch (error) {
      console.error("Error getting quiz:", error);
      res.status(500).json({ message: "Failed to get quiz" });
    }
  });

  app.get("/api/quizzes/code/:code", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      const quiz = await storage.getQuizByCode(code);

      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      res.json(quiz);
    } catch (error) {
      console.error("Error getting quiz by code:", error);
      res.status(500).json({ message: "Failed to get quiz" });
    }
  });

  app.post("/api/quizzes", async (req: Request, res: Response) => {
    try {
      const parseResult = insertQuizSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid quiz data", 
          errors: parseResult.error.errors 
        });
      }

      const quiz = await storage.createQuiz(parseResult.data);
      res.status(201).json(quiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      res.status(500).json({ message: "Failed to create quiz" });
    }
  });

  app.delete("/api/quizzes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteQuiz(id);

      if (!deleted) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      res.status(200).json({ message: "Quiz deleted successfully" });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ message: "Failed to delete quiz" });
    }
  });

  // Quiz Attempts Routes
  app.get("/api/quiz-attempts/:quizId", async (req: Request, res: Response) => {
    try {
      const quizId = parseInt(req.params.quizId);
      const attempts = await storage.getQuizAttempts(quizId);
      res.json(attempts);
    } catch (error) {
      console.error("Error getting quiz attempts:", error);
      res.status(500).json({ message: "Failed to get quiz attempts" });
    }
  });

  app.post("/api/quiz-attempts", async (req: Request, res: Response) => {
    try {
      const parseResult = insertQuizAttemptSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid quiz attempt data", 
          errors: parseResult.error.errors 
        });
      }

      const attempt = await storage.createQuizAttempt(parseResult.data);
      res.status(201).json(attempt);
    } catch (error) {
      console.error("Error creating quiz attempt:", error);
      res.status(500).json({ message: "Failed to create quiz attempt" });
    }
  });

  // Visitor counter
  let visitorsCount = 0;

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    // Only count visits to main pages
    if (path === '/' || path === '/files' || path === '/exams' || path === '/quizzes') {
      visitorsCount++;
    }

    next();
  });

    app.get("/api/visitors", async (_req: Request, res: Response) => {
    try {
      res.json({ visitors: visitorsCount });
    } catch (error) {
      console.error("Error getting visitors:", error);
      res.status(500).json({ message: "Failed to get visitors" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}