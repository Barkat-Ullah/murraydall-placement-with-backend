import multer from 'multer';

const storage = multer.memoryStorage(); // Store files in memory as Buffer

export const upload = multer({
    storage: storage,
    limits: {
        // 100 MB in bytes
        fileSize: 100 * 1024 * 1024,
    },
});