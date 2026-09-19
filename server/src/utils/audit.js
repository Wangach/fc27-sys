export async function writeAudit(
  db,
  req,
  action,
  entityType,
  entityId = null,
  metadata = null,
) {
  return db.auditLog.create({
    data: {
      userId: req.user?.id || null,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress: req.ip || null,
    },
  });
}
