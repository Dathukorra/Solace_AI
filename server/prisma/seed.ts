import { PrismaClient, Role, ActivityType, ReminderType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Solace AI database seed...');

  // 1. Clean existing records (in reverse dependency order)
  await prisma.passwordResetToken.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.userMemory.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.moodCheckin.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // 2. Create primary demo user
  const user = await prisma.user.create({
    data: {
      name: 'Alex River',
      email: 'alex@solace.ai',
      passwordHash: await bcrypt.hash('solace_password_123', 10),
      goals: [
        'Reduce daily anxiety & work stress',
        'Build a consistent evening wind-down routine',
        'Practice daily gratitude and mindfulness check-ins',
      ],
      timezone: 'America/New_York',
      aiMemoryEnabled: true,
    },
  });

  console.log(`👤 Created user: ${user.name} (${user.email})`);

  // 3. Seed Mood Check-ins
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60);
  const yesterday = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const twoDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 48);
  const threeDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 72);

  await prisma.moodCheckin.createMany({
    data: [
      {
        userId: user.id,
        mood: 5, // Happy (warm peach)
        emotions: ['grateful', 'peaceful', 'energized'],
        note: 'Had a restorative morning walk under the autumn sun.',
        createdAt: now,
      },
      {
        userId: user.id,
        mood: 4, // Good (gentle sage)
        emotions: ['calm', 'grounded'],
        note: 'Finished my design sprint tasks with gentle breathing pauses.',
        createdAt: oneHourAgo,
      },
      {
        userId: user.id,
        mood: 3, // Neutral (dusty lavender)
        emotions: ['tired', 'pensive'],
        note: 'Afternoon meetings were long, taking a short tea pause.',
        createdAt: yesterday,
      },
      {
        userId: user.id,
        mood: 2, // Low (soft slate)
        emotions: ['overwhelmed', 'fatigued'],
        note: 'Felt work stress accumulating toward the end of the day.',
        createdAt: twoDaysAgo,
      },
      {
        userId: user.id,
        mood: 1, // Sad (muted blue)
        emotions: ['sad', 'drained'],
        note: 'Difficult personal news, allowing myself time to rest.',
        createdAt: threeDaysAgo,
      },
    ],
  });

  console.log('✨ Seeded 5 mood check-in records across scale 1-5.');

  // 4. Seed Conversation with Messages
  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: 'Finding Ease Amid Work Deadlines',
      summary: 'Alex discussed deadline pressures; Sola guided a 4-minute box breathing session.',
      updatedAt: now,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: Role.USER,
        content:
          'Hi Solace, I have been feeling quite overwhelmed with work deadlines this afternoon.',
        createdAt: new Date(now.getTime() - 1000 * 60 * 15),
      },
      {
        conversationId: conversation.id,
        role: Role.ASSISTANT,
        content:
          'I hear you, Alex. It is completely normal for your body and mind to tighten when deadlines mount. Would you like to take a mindful pause together and do a 4-minute box breathing exercise?',
        suggestedActivity: {
          title: 'Box Breathing Reset',
          category: 'breathing',
          durationMinutes: 4,
          icon: '🫁',
        },
        createdAt: new Date(now.getTime() - 1000 * 60 * 14),
      },
      {
        conversationId: conversation.id,
        role: Role.USER,
        content: 'Yes please, that sounds really soothing right now.',
        createdAt: new Date(now.getTime() - 1000 * 60 * 12),
      },
      {
        conversationId: conversation.id,
        role: Role.ASSISTANT,
        content:
          'Wonderful. Place one hand gently over your chest. Inhale slowly for 4 seconds, hold softly for 4, exhale gently for 4, and hold empty for 4. Whenever you are ready, follow your natural rhythm.',
        createdAt: new Date(now.getTime() - 1000 * 60 * 10),
      },
    ],
  });

  console.log('💬 Seeded conversation and 4 back-and-forth messages.');

  // 5. Seed User Memory (AI companion contextual memory)
  await prisma.userMemory.createMany({
    data: [
      {
        userId: user.id,
        fact: 'Prefers short 4-minute breathing exercises over longer guided meditations during work hours',
        source: 'conversation',
        createdAt: yesterday,
      },
      {
        userId: user.id,
        fact: 'Works as a senior product designer with occasional sprint deadline stress',
        source: 'user_stated',
        createdAt: twoDaysAgo,
      },
      {
        userId: user.id,
        fact: 'Enjoys evening chamomile tea and screen-free reading before sleep',
        source: 'journal',
        createdAt: threeDaysAgo,
      },
    ],
  });

  console.log('🧠 Seeded 3 AI companion user memory items.');

  // 6. Seed Completed Activities
  await prisma.activity.createMany({
    data: [
      {
        userId: user.id,
        type: ActivityType.BREATHING,
        durationSec: 240, // 4 mins
        completedAt: now,
      },
      {
        userId: user.id,
        type: ActivityType.BODY_SCAN,
        durationSec: 600, // 10 mins
        completedAt: yesterday,
      },
      {
        userId: user.id,
        type: ActivityType.JOURNALING,
        durationSec: 300, // 5 mins
        completedAt: twoDaysAgo,
      },
      {
        userId: user.id,
        type: ActivityType.MOVEMENT,
        durationSec: 360, // 6 mins
        completedAt: threeDaysAgo,
      },
    ],
  });

  console.log('🌿 Seeded 4 wellness activity records.');

  // 7. Seed Gentle Reminders
  await prisma.reminder.createMany({
    data: [
      {
        userId: user.id,
        type: ReminderType.MINDFULNESS,
        title: 'Morning Mindful Check-in',
        time: '08:30',
        days: [1, 2, 3, 4, 5], // Monday through Friday
        enabled: true,
      },
      {
        userId: user.id,
        type: ReminderType.HYDRATION,
        title: 'Midday Breath & Water Pause',
        time: '13:30',
        days: [0, 1, 2, 3, 4, 5, 6], // Every day
        enabled: true,
      },
      {
        userId: user.id,
        type: ReminderType.WIND_DOWN,
        title: 'Evening Gratitude Reflection',
        time: '21:30',
        days: [0, 1, 2, 3, 4, 5, 6], // Every day
        enabled: true,
      },
    ],
  });

  console.log('⏰ Seeded 3 gentle reminder schedules.');

  // 8. Seed Push Notification Token
  await prisma.pushToken.create({
    data: {
      userId: user.id,
      token: 'ExponentPushToken[demo_push_token_alex_solace_ai]',
      platform: 'ios',
    },
  });

  console.log('🔔 Seeded push notification token.');
  console.log('✅ Solace AI database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
