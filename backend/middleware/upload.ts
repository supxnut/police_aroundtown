import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsBaseDir = path.join(process.cwd(), 'uploads');
const dirs = ['avatars', 'activities', 'shop'];

dirs.forEach((dir) => {
  const fullPath = path.join(uploadsBaseDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'activities';
    if (file.fieldname === 'avatar') folder = 'avatars';
    if (file.fieldname === 'shopImage') folder = 'shop';
    cb(null, path.join(uploadsBaseDir, folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed!'));
  },
});
