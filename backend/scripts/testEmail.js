import dotenv from 'dotenv';
dotenv.config();
import { sendFeedbackEmail } from '../services/emailService.js';

const result = await sendFeedbackEmail({
  userName: 'Jeeva Akash',
  userEmail: 'test@example.com',
  userType: 'student',
  rating: 5,
  category: 'General',
  message: 'Test feedback email from EduLearn platform. If you received this, email notifications are working!'
});

console.log(result ? '✅ Email sent successfully!' : '❌ Email failed');
