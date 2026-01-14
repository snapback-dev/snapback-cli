import { __name } from './chunk-WCQVDF3K.js';
import { nanoid } from 'nanoid';

function generateId(prefix) {
  const id = nanoid();
  return prefix ? `${prefix}-${id}` : id;
}
__name(generateId, "generateId");
function slugify(description, maxLength = 30) {
  return description.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, maxLength);
}
__name(slugify, "slugify");
function generateSnapshotId(description) {
  if (description && description.length > 0) {
    const slug = slugify(description);
    if (slug.length > 0) {
      return `snapshot-${slug}-${Date.now()}-${nanoid(9)}`;
    }
  }
  return `snapshot-${Date.now()}-${nanoid(9)}`;
}
__name(generateSnapshotId, "generateSnapshotId");

export { generateId, generateSnapshotId };
//# sourceMappingURL=chunk-BCIXMIPW.js.map
//# sourceMappingURL=chunk-BCIXMIPW.js.map