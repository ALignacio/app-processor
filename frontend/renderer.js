const { jsPDF } = require('jspdf');

const fileInput = document.getElementById("fileInput");
const operationSelect = document.getElementById("operation");
const resultsDiv = document.getElementById("results");
const exportPdfBtn = document.getElementById("exportPdfBtn");

let currentImages = [];

// Helper to convert File to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Process a single image with the selected filter
async function processImage(file, operation, imageCard) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("operation", operation);

  try {
    const response = await fetch("http://127.0.0.1:8000/process", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("Failed to process image");
    }

    const data = await response.json();
    return data.processed_image;
  } catch (error) {
    console.error("Error processing image:", error);
    if (imageCard) {
      imageCard.querySelector('.processed-image').style.display = 'none';
      imageCard.querySelector('.error-message').textContent = 'Error processing image: ' + error.message;
      imageCard.querySelector('.error-message').style.display = 'block';
    }
    return null;
  }
}

// Create image card UI
function createImageCard(file, originalBase64) {
  const card = document.createElement("div");
  card.className = "image-card";

  // Images container
  const imagesContainer = document.createElement("div");
  imagesContainer.style.display = "flex";
  imagesContainer.style.gap = "20px";
  imagesContainer.style.flexWrap = "wrap";
  imagesContainer.style.justifyContent = "center";

  // Original image
  const originalContainer = document.createElement("div");
  originalContainer.className = "image-container";
  const originalLabel = document.createElement("p");
  originalLabel.textContent = "Original";
  const originalImg = document.createElement("img");
  originalImg.src = `data:image/png;base64,${originalBase64}`;
  originalImg.alt = "Original";
  originalContainer.appendChild(originalLabel);
  originalContainer.appendChild(originalImg);

  // Processed image
  const processedContainer = document.createElement("div");
  processedContainer.className = "image-container";
  const processedLabel = document.createElement("p");
  processedLabel.textContent = "Processed";
  const processedImg = document.createElement("img");
  processedImg.className = "processed-image";
  processedImg.alt = "Processed";
  processedContainer.appendChild(processedLabel);
  processedContainer.appendChild(processedImg);

  // Error message
  const errorMessage = document.createElement("p");
  errorMessage.className = "error-message";
  errorMessage.style.display = "none";
  errorMessage.style.color = "#ff4444";
  processedContainer.appendChild(errorMessage);

  // Loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "loading";
  loadingIndicator.style.display = "none";
  processedContainer.appendChild(loadingIndicator);

  imagesContainer.appendChild(originalContainer);
  imagesContainer.appendChild(processedContainer);
  card.appendChild(imagesContainer);

  // Filter select for this image
  const filterSelect = document.createElement("select");
  filterSelect.className = "filter-select";
  filterSelect.innerHTML = operationSelect.innerHTML;
  filterSelect.value = operationSelect.value;

  // Download buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "buttons-container";
  
  const downloadPngBtn = document.createElement("button");
  downloadPngBtn.textContent = "Download PNG";
  const downloadJpgBtn = document.createElement("button");
  downloadJpgBtn.textContent = "Download JPG";

  buttonsContainer.appendChild(filterSelect);
  buttonsContainer.appendChild(downloadPngBtn);
  buttonsContainer.appendChild(downloadJpgBtn);
  card.appendChild(buttonsContainer);

  // Add event listener for filter changes
  filterSelect.addEventListener("change", async () => {
    const loadingIndicator = card.querySelector('.loading');
    const processedImg = card.querySelector('.processed-image');
    const errorMessage = card.querySelector('.error-message');

    loadingIndicator.style.display = "block";
    processedImg.style.display = "none";
    errorMessage.style.display = "none";

    const processedBase64 = await processImage(file, filterSelect.value, card);
    
    if (processedBase64) {
      processedImg.src = `data:image/png;base64,${processedBase64}`;
      processedImg.style.display = "block";
      updateDownloadButtons(downloadPngBtn, downloadJpgBtn, processedBase64, file.name);
    }

    loadingIndicator.style.display = "none";
  });

  // Set up download buttons
  const updateDownloadButtons = (pngBtn, jpgBtn, processedBase64, fileName) => {
    pngBtn.onclick = () => {
      const link = document.createElement("a");
      link.href = `data:image/png;base64,${processedBase64}`;
      link.download = `processed_${fileName.replace(/\.[^/.]+$/, "")}.png`;
      link.click();
    };

    jpgBtn.onclick = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `processed_${fileName.replace(/\.[^/.]+$/, "")}.jpg`;
          link.click();
          URL.revokeObjectURL(url);
        }, "image/jpeg", 0.9);
      };
      img.src = `data:image/png;base64,${processedBase64}`;
    };
  };

  // Trigger initial processing
  filterSelect.dispatchEvent(new Event('change'));

  return card;
}

// Handle file selection
fileInput.addEventListener("change", async () => {
  const files = fileInput.files;
  if (files.length === 0) return;

  // Clear previous results
  resultsDiv.innerHTML = "";
  resultsDiv.classList.remove("empty-state");
  currentImages = [];

  for (const file of files) {
    try {
      const originalBase64 = await fileToBase64(file);
      const imageCard = createImageCard(file, originalBase64);
      resultsDiv.appendChild(imageCard);
      currentImages.push({ file, originalBase64 });
    } catch (error) {
      console.error("Error loading image:", error);
    }
  }

  // Show export PDF button if there are images
  exportPdfBtn.style.display = currentImages.length > 0 ? "inline" : "none";
});

// Handle global filter changes
operationSelect.addEventListener("change", () => {
  document.querySelectorAll('.filter-select').forEach(select => {
    select.value = operationSelect.value;
    select.dispatchEvent(new Event('change'));
  });
});

// Handle PDF export
exportPdfBtn.addEventListener("click", async () => {
  const doc = new jsPDF();
  const processedImages = [];

  // Collect all current processed images
  const imageCards = document.querySelectorAll('.image-card');
  for (const card of imageCards) {
    const originalImg = card.querySelector('.image-container:first-child img');
    const processedImg = card.querySelector('.processed-image');
    const filterSelect = card.querySelector('.filter-select');
    const fileName = card.querySelector('h3').textContent;

    processedImages.push({
      name: fileName,
      originalSrc: originalImg.src.split(',')[1],
      processedSrc: processedImg.src.split(',')[1],
      operation: filterSelect.value
    });
  }

  // Generate PDF
  processedImages.forEach((img, index) => {
    if (index > 0) doc.addPage();
    doc.text(`Image: ${img.name}`, 10, 10);
    doc.text("Original Image", 10, 20);
    doc.text(`Processed Image (${img.operation})`, 105, 20);
    doc.addImage(`data:image/png;base64,${img.originalSrc}`, 'PNG', 10, 30, 85, 120);
    doc.addImage(`data:image/png;base64,${img.processedSrc}`, 'PNG', 105, 30, 85, 120);
  });

  // Generate PDF blob
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Set iframe src to display PDF
  const pdfFrame = document.getElementById("pdfFrame");
  pdfFrame.src = pdfUrl;

  // Show PDF preview
  const pdfPreview = document.getElementById("pdfPreview");
  pdfPreview.style.display = "block";

  // Store blob for download
  pdfPreview.dataset.pdfBlob = pdfUrl;
});

const downloadPdfBtn = document.getElementById("downloadPdfBtn");
downloadPdfBtn.addEventListener("click", () => {
  const pdfPreview = document.getElementById("pdfPreview");
  const pdfUrl = pdfPreview.dataset.pdfBlob;
  if (pdfUrl) {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "processed_images_report.pdf";
    link.click();
  }
});
