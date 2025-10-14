import prisma from '@/lib/db';

async function migrateNotifications() {
  try {
    // Find all FOLLOW_UP notifications that might be diagnostic results
    const notifications = await prisma.notification.findMany({
      where: {
        type: 'FOLLOW_UP',
        title: 'Nouveau diagnostic créé'
      },
      include: {
        patient: true
      }
    });

    console.log(`Found ${notifications.length} notifications to migrate`);

    for (const notification of notifications) {
      // Extract diagnostic ID from metadata if available
      let diagnosticId = null;
      if (notification.metadata && typeof notification.metadata === 'object') {
        diagnosticId = (notification.metadata as any).diagnosticId;
      }

      // If we have a diagnostic ID, fetch the diagnostic details
      if (diagnosticId) {
        const diagnostic = await prisma.diagnostic.findUnique({
          where: { id: diagnosticId },
          include: {
            medicalDevice: true,
            patient: true
          }
        });

        if (diagnostic) {
          // Update the notification with proper metadata
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              dueDate: notification.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from creation if not set
              metadata: {
                diagnosticId,
                deviceId: diagnostic.medicalDeviceId,
                deviceName: diagnostic.medicalDevice.name,
                parameterId: diagnosticId, // Using diagnostic ID as parameter ID
                parameterName: 'Résultat de diagnostic'
              }
            }
          });
          console.log(`Updated notification ${notification.id} with diagnostic ${diagnosticId}`);
        }
      } else {
        // For notifications without diagnostic ID, just ensure they have a proper due date
        if (!notification.dueDate) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              dueDate: new Date(notification.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from creation
            }
          });
          console.log(`Updated notification ${notification.id} with due date`);
        }
      }
    }

    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateNotifications();