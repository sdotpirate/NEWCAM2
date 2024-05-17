const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const saveButton = document.getElementById('save');

upload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            processImage(img);
        };
    }
});

async function processImage(img) {
    // Set canvas size to image size
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);

    // Convert the image to grayscale
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // Apply GaussianBlur
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Detect edges
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 75, 200);

    // Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    // Filter contours by aspect ratio and size
    let maxArea = 0;
    let largestContour = null;
    const targetAspectRatio = 8.5 / 11;
    const tolerance = 0.2; // 20% tolerance for aspect ratio
    const minArea = img.width * img.height * 0.1; // minimum area threshold

    for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        const aspectRatio = rect.width / rect.height;
        const area = rect.width * rect.height;

        if (Math.abs(aspectRatio - targetAspectRatio) < tolerance && area > minArea) {
            if (area > maxArea) {
                maxArea = area;
                largestContour = contour;
            }
        }
    }

    // Draw the largest contour
    if (largestContour) {
        const boundingRect = cv.boundingRect(largestContour);

        // Draw red box on the original image
        context.drawImage(img, 0, 0);  // Redraw the original image to remove previous drawings
        context.strokeStyle = 'red';
        context.lineWidth = 2;
        context.strokeRect(boundingRect.x, boundingRect.y, boundingRect.width, boundingRect.height);

        // Save the coordinates for cropping
        canvas.dataset.boundingRect = JSON.stringify(boundingRect);

        saveButton.hidden = false;
    }

    // Clean up
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();

    // Adjust canvas size to fit the screen
    adjustCanvasSize();
}

function adjustCanvasSize() {
    const container = document.querySelector('.canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const aspectRatio = canvas.width / canvas.height;

    if (containerWidth / containerHeight > aspectRatio) {
        canvas.style.width = 'auto';
        canvas.style.height = '100%';
    } else {
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
    }
}

window.addEventListener('resize', adjustCanvasSize);

saveButton.addEventListener('click', () => {
    const boundingRect = JSON.parse(canvas.dataset.boundingRect);
    const croppedCanvas = document.createElement('canvas');
    const croppedContext = croppedCanvas.getContext('2d');

    croppedCanvas.width = boundingRect.width;
    croppedCanvas.height = boundingRect.height;
    croppedContext.drawImage(canvas,
        boundingRect.x, boundingRect.y, boundingRect.width, boundingRect.height,
        0, 0, boundingRect.width, boundingRect.height
    );

    const link = document.createElement('a');
    link.download = 'cropped-image.png';
    link.href = croppedCanvas.toDataURL();
    link.click();
});
