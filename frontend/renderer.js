const { jsPDF } = require('jspdf');

const fileInput = document.getElementById("fileInput");
const resultsDiv = document.getElementById("results");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const downloadPdfFloatingBtn = document.getElementById("downloadPdfFloatingBtn");
const addImageBtn = document.getElementById("addImageBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const clearAllFiltersBtn = document.getElementById("clearAllFiltersBtn");

// Global variable to store the current PDF blob
let currentPdfBlob = null;

const globalLightenSlider = document.getElementById('global-lighten-slider');
const globalLightenValue = document.getElementById('global-lighten-value');
const globalDarkenSlider = document.getElementById('global-darken-slider');
const globalDarkenValue = document.getElementById('global-darken-value');
const globalRotateSlider = document.getElementById('global-rotate-slider');
const globalRotateValue = document.getElementById('global-rotate-value');

const globalLightenControls = document.getElementById('global-lighten-controls');
const globalDarkenControls = document.getElementById('global-darken-controls');
const globalRotateControls = document.getElementById('global-rotate-controls');

const globalBlurSlider = document.getElementById('global-blur-slider');
const globalBlurValue = document.getElementById('global-blur-value');
const globalThresholdSlider = document.getElementById('global-threshold-slider');
const globalThresholdValue = document.getElementById('global-threshold-value');
const globalHueshiftSlider = document.getElementById('global-hueshift-slider');
const globalHueshiftValue = document.getElementById('global-hueshift-value');

const globalBlurControls = document.getElementById('global-blur-controls');
const globalThresholdControls = document.getElementById('global-threshold-controls');
const globalHueshiftControls = document.getElementById('global-hueshift-controls');

let currentImages = [];

// Image modal close handlers
const imageModal = document.getElementById('imageModal');
const modalClose = document.querySelector('.image-modal-close');

if (modalClose) {
  modalClose.addEventListener('click', () => {
    imageModal.style.display = 'none';
  });
}

imageModal.addEventListener('click', (e) => {
  if (e.target === imageModal) {
    imageModal.style.display = 'none';
  }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && imageModal.style.display === 'flex') {
    imageModal.style.display = 'none';
  }
});

// Update grid layout based on number of items
function updateGridLayout() {
  const cardCount = resultsDiv.querySelectorAll('.image-card').length;
  resultsDiv.className = 'image-workspace';
  
  if (cardCount === 0) {
    resultsDiv.classList.add('empty-state');
  } else if (cardCount === 1) {
    resultsDiv.classList.add('single-item');
  } else if (cardCount === 2) {
    resultsDiv.classList.add('two-items');
  } else if (cardCount === 3) {
    resultsDiv.classList.add('three-items');
  } else if (cardCount === 4) {
    resultsDiv.classList.add('four-items');
  } else if (cardCount === 5) {
    resultsDiv.classList.add('five-items');
  } else if (cardCount === 6) {
    resultsDiv.classList.add('six-items');
  } else {
    resultsDiv.classList.add('many-items');
  }
}

// Debounce function
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}


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
async function processImage(file, operations, imageCard) {
  console.log('processImage called with:', { file, operations });
  const formData = new FormData();
  formData.append("file", file);
  formData.append("operations", JSON.stringify(operations));
  if (operations.length === 0) {
    formData.append("operations", JSON.stringify([{ name: 'original' }]));
  }

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
      const errorMessage = imageCard.querySelector('.error-message');
      errorMessage.textContent = 'Error processing image: ' + error.message;
      errorMessage.style.display = 'block';
      errorMessage.classList.add('status-message', 'status-error');
    }
    return null;
  }
}

// Create image card UI
function createImageCard(file, originalBase64) {
  const card = document.createElement("div");
  card.className = "image-card";
  card.dataset.fileName = file.name;
  card.dataset.filters = JSON.stringify([]); // Store active filters here

  // Delete card button
  const deleteCardBtn = document.createElement("button");
  deleteCardBtn.className = "delete-card-btn";
  deleteCardBtn.textContent = "✕";
  deleteCardBtn.onclick = () => {
    currentImages = currentImages.filter(img => img.card !== card);
    card.remove();
    updateGridLayout();
  };
  card.appendChild(deleteCardBtn);

  // Images container (for Original and Processed side-by-side)
  const imagesContainer = document.createElement("div");
  imagesContainer.className = "images-container";
  
  // Add drag scrolling functionality
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  
  imagesContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.pageX - imagesContainer.offsetLeft;
    scrollLeft = imagesContainer.scrollLeft;
    imagesContainer.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mouseleave', () => {
    isDragging = false;
    imagesContainer.style.cursor = 'grab';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    imagesContainer.style.cursor = 'grab';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - imagesContainer.offsetLeft;
    const scroll = x - startX;
    imagesContainer.scrollLeft = scrollLeft - scroll;
  });

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
  processedLabel.style.display = "none"; // Initially hide the processed label
  const processedImg = document.createElement("img");
  processedImg.className = "processed-image clickable-image";
  processedImg.alt = "Processed";
  processedImg.style.cursor = "pointer";
  
  // Add click handler to enlarge processed image
  processedImg.addEventListener('click', (e) => {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modalImg.src = processedImg.src;
    modal.style.display = 'flex';
    e.stopPropagation();
  });
  
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

  // Scrollable section for filter options
  const scrollableFiltersSection = document.createElement("div");
  scrollableFiltersSection.className = "scrollable-filters-section";
  
  // Filter checkboxes for this image
  const cardFiltersContainer = document.createElement("div");
  cardFiltersContainer.className = "filters-container";
  cardFiltersContainer.innerHTML = `
    <label><input type="checkbox" class="filter-checkbox" value="rotate"> Rotate</label>
    <label><input type="checkbox" class="filter-checkbox" value="lighten"> Lighten</label>
    <label><input type="checkbox" class="filter-checkbox" value="darken"> Darken</label>
    <label><input type="checkbox" class="filter-checkbox" value="blur"> Blur</label>
    <label><input type="checkbox" class="filter-checkbox" value="threshold"> Thresholding</label>
    <label><input type="checkbox" class="filter-checkbox" value="hueshift"> Hue Shift</label>
    <label><input type="checkbox" class="filter-checkbox" value="flip"> Flip</label>
    <label><input type="checkbox" class="filter-checkbox" value="resize"> Resize</label>
    <label><input type="checkbox" class="filter-checkbox" value="edge_detection"> Edge Detection</label>
    <label><input type="checkbox" class="filter-checkbox" value="grayscale"> Grayscale</label>
  `;
  
  const clearFiltersBtn = document.createElement("button");
  clearFiltersBtn.textContent = "Clear Filters";
  clearFiltersBtn.className = "clear-filters-btn";

  scrollableFiltersSection.appendChild(cardFiltersContainer);

  // Sliders container (inside scrollable section)
  const slidersContainer = document.createElement("div");
  slidersContainer.className = "sliders-container";
  scrollableFiltersSection.appendChild(slidersContainer);
  
  card.appendChild(scrollableFiltersSection);

  // Rotate slider
  const rotateControls = document.createElement("div");
  rotateControls.className = "filter-controls rotate-controls";
  rotateControls.style.display = "none";
  rotateControls.innerHTML = `
    <label for="rotate-slider-${file.name}">Angle:</label>
    <input type="range" id="rotate-slider-${file.name}" min="0" max="360" value="90">
    <span class="rotate-value">90</span>
  `;
  slidersContainer.appendChild(rotateControls);

  // Lighten slider
  const lightenControls = document.createElement("div");
  lightenControls.className = "filter-controls lighten-controls";
  lightenControls.style.display = "none";
  lightenControls.innerHTML = `
    <label for="lighten-slider-${file.name}">Amount:</label>
    <input type="range" id="lighten-slider-${file.name}" min="0" max="100" value="50">
    <span class="lighten-value">50</span>
  `;
  slidersContainer.appendChild(lightenControls);

  // Darken slider
  const darkenControls = document.createElement("div");
  darkenControls.className = "filter-controls darken-controls";
  darkenControls.style.display = "none";
  darkenControls.innerHTML = `
    <label for="darken-slider-${file.name}">Amount:</label>
    <input type="range" id="darken-slider-${file.name}" min="0" max="100" value="50">
    <span class="darken-value">50</span>
  `;
  slidersContainer.appendChild(darkenControls);

  // Blur slider
  const blurControls = document.createElement("div");
  blurControls.className = "filter-controls blur-controls";
  blurControls.style.display = "none";
  blurControls.innerHTML = `
    <label for="blur-slider-${file.name}">Amount:</label>
    <input type="range" id="blur-slider-${file.name}" min="1" max="99" value="15" step="2">
    <span class="blur-value">15</span>
  `;
  slidersContainer.appendChild(blurControls);

  // Threshold slider
  const thresholdControls = document.createElement("div");
  thresholdControls.className = "filter-controls threshold-controls";
  thresholdControls.style.display = "none";
  thresholdControls.innerHTML = `
    <label for="threshold-slider-${file.name}">Threshold:</label>
    <input type="range" id="threshold-slider-${file.name}" min="0" max="255" value="127">
    <span class="threshold-value">127</span>
  `;
  slidersContainer.appendChild(thresholdControls);

  // Hue Shift slider
  const hueshiftControls = document.createElement("div");
  hueshiftControls.className = "filter-controls hueshift-controls";
  hueshiftControls.style.display = "none";
  hueshiftControls.innerHTML = `
    <label for="hueshift-slider-${file.name}">Hue:</label>
    <input type="range" id="hueshift-slider-${file.name}" min="0" max="360" value="180">
    <span class="hueshift-value">180</span>
  `;
  slidersContainer.appendChild(hueshiftControls);

  // Flip dropdown
  const flipControls = document.createElement("div");
  flipControls.className = "filter-controls flip-controls";
  flipControls.style.display = "none";
  flipControls.innerHTML = `
    <label for="flip-select-${file.name}">Direction:</label>
    <select id="flip-select-${file.name}">
      <option value="horizontal">Horizontal</option>
      <option value="vertical">Vertical</option>
    </select>
  `;
  slidersContainer.appendChild(flipControls);

  // Resize inputs
  const resizeControls = document.createElement("div");
  resizeControls.className = "filter-controls resize-controls";
  resizeControls.style.display = "none";
  resizeControls.innerHTML = `
    <label>Width:</label>
    <input type="number" class="resize-width-input" value="100" style="width: 60px;">
    <label>Height:</label>
    <input type="number" class="resize-height-input" value="100" style="width: 60px;">
  `;
  slidersContainer.appendChild(resizeControls);

  // Edge Detection (no controls needed)
  // Grayscale (no controls needed)

  // Download buttons container (fixed at bottom)
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "buttons-container";
  
  const downloadPngBtn = document.createElement("button");
  downloadPngBtn.textContent = "Download PNG";
  const downloadJpgBtn = document.createElement("button");
  downloadJpgBtn.textContent = "Download JPG";

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "delete-btn";

  buttonsContainer.appendChild(downloadPngBtn);
  buttonsContainer.appendChild(downloadJpgBtn);
  buttonsContainer.appendChild(clearFiltersBtn);
  buttonsContainer.appendChild(deleteBtn);
  card.appendChild(buttonsContainer);

  // Add event listener for delete button
  deleteBtn.addEventListener("click", () => {
    card.remove(); // Remove the card from the DOM
    currentImages = currentImages.filter(item => item.file !== file);
    
    const hasImages = currentImages.length > 0;
    exportPdfBtn.style.display = hasImages ? "inline" : "none";
    deleteAllBtn.style.display = hasImages ? "block" : "none";
    addImageBtn.style.display = hasImages ? "block" : "none";

    if (!hasImages) {
      // Hide global controls
      globalLightenControls.style.display = 'none';
      globalDarkenControls.style.display = 'none';
      globalRotateControls.style.display = 'none';
      globalBlurControls.style.display = 'none';
      globalThresholdControls.style.display = 'none';
      globalHueshiftControls.style.display = 'none';
      
      resultsDiv.classList.add("empty-state");
      resultsDiv.innerHTML = `
        <label for="fileInput" class="drop-zone">
          <p>Open an image to begin editing</p>
        </label>
      `;
    }
  });

  // Function to handle filter changes
  const applyFilters = async (e) => {
    console.log('applyFilters called', e);
    const card = e.target.closest('.image-card');
    const loadingIndicator = card.querySelector('.loading');
    const processedImg = card.querySelector('.processed-image');
    const errorMessage = card.querySelector('.error-message');
    const successMessage = card.querySelector('.success-message');
    const processedLabel = card.querySelector('.image-container:nth-child(2) p');

    loadingIndicator.style.display = "block";
    processedImg.style.display = "none";
    errorMessage.style.display = "none";
    if(successMessage) successMessage.style.display = "none";
    if(processedLabel) processedLabel.style.display = "none";

    const selectedFilters = Array.from(card.querySelectorAll('.filter-checkbox:checked')).map(cb => cb.value);
    let currentFilters = JSON.parse(card.dataset.filters || '[]');

    // Update currentFilters based on selectedFilters
    currentFilters = selectedFilters.map(name => {
      const existingFilter = currentFilters.find(f => f.name === name);
      return existingFilter || { name, value: null };
    });

    // Show/hide sliders based on operation
    rotateControls.style.display = selectedFilters.includes('rotate') ? 'block' : 'none';
    lightenControls.style.display = selectedFilters.includes('lighten') ? 'block' : 'none';
    darkenControls.style.display = selectedFilters.includes('darken') ? 'block' : 'none';
    blurControls.style.display = selectedFilters.includes('blur') ? 'block' : 'none';
    card.querySelector('.threshold-controls').style.display = selectedFilters.includes('threshold') ? 'block' : 'none';
    card.querySelector('.hueshift-controls').style.display = selectedFilters.includes('hueshift') ? 'block' : 'none';
    card.querySelector('.flip-controls').style.display = selectedFilters.includes('flip') ? 'block' : 'none';
    card.querySelector('.resize-controls').style.display = selectedFilters.includes('resize') ? 'block' : 'none';

    // Update value for the active filter
    currentFilters.forEach(filter => {
      if (filter.name === 'rotate') {
        filter.value = card.querySelector('.rotate-controls input').value;
      } else if (filter.name === 'lighten') {
        filter.value = card.querySelector('.lighten-controls input').value;
      } else if (filter.name === 'darken') {
        filter.value = card.querySelector('.darken-controls input').value;
      } else if (filter.name === 'blur') {
        filter.value = card.querySelector('.blur-controls input').value;
      } else if (filter.name === 'threshold') {
        filter.value = card.querySelector('.threshold-controls input').value;
      } else if (filter.name === 'hueshift') {
        filter.value = card.querySelector('.hueshift-controls input').value;
      } else if (filter.name === 'flip') {
        filter.value = card.querySelector('.flip-controls select').value;
      } else if (filter.name === 'resize') {
        const width = card.querySelector('.resize-controls .resize-width-input').value;
        const height = card.querySelector('.resize-controls .resize-height-input').value;
        filter.value = { width: parseInt(width, 10) || 0, height: parseInt(height, 10) || 0 };
      }
    });
    
    card.dataset.filters = JSON.stringify(currentFilters);

    const processedBase64 = await processImage(file, currentFilters, card);
    
    if (processedBase64) {
      processedImg.src = `data:image/png;base64,${processedBase64}`;
      processedImg.style.display = "block";
      processedLabel.style.display = "block";
      updateDownloadButtons(downloadPngBtn, downloadJpgBtn, processedBase64, file.name);

      const successMessage = card.querySelector('.success-message');
      if (successMessage) {
        successMessage.remove();
      }

      const newSuccessMessage = document.createElement('p');
      newSuccessMessage.textContent = 'Image processed successfully!';
      newSuccessMessage.classList.add('status-message', 'status-success', 'success-message');
      processedContainer.appendChild(newSuccessMessage);

    }

    loadingIndicator.style.display = "none";
  };

  card.querySelectorAll('.filter-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
  });

  clearFiltersBtn.addEventListener('click', (e) => {
    card.querySelectorAll('.filter-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    applyFilters(e);
  });

  const debouncedApplyFilters = debounce(applyFilters, 250);

  // Add event listeners for sliders
  card.querySelector('.rotate-controls input').addEventListener('input', (e) => {
    console.log('Rotate slider input event');
    card.querySelector('.rotate-value').textContent = e.target.value;
    debouncedApplyFilters(e);
  });
  card.querySelector('.lighten-controls input').addEventListener('input', (e) => {
    console.log('Lighten slider input event');
    card.querySelector('.lighten-value').textContent = e.target.value;
    debouncedApplyFilters(e);
  });
  card.querySelector('.darken-controls input').addEventListener('input', (e) => {
    console.log('Darken slider input event');
    card.querySelector('.darken-value').textContent = e.target.value;
    debouncedApplyFilters(e);
  });
  card.querySelector('.blur-controls input').addEventListener('input', (e) => {
    console.log('Blur slider input event');
    card.querySelector('.blur-value').textContent = e.target.value;
    debouncedApplyFilters(e);
  });

  // Add event listeners for new sliders
  const thresholdInput = card.querySelector('.threshold-controls input');
  if (thresholdInput) {
    thresholdInput.addEventListener('input', (e) => {
      const thresholdValue = card.querySelector('.threshold-value');
      if (thresholdValue) {
        thresholdValue.textContent = e.target.value;
      }
      debouncedApplyFilters(e);
    });
  }

  const hueshiftInput = card.querySelector('.hueshift-controls input');
  if (hueshiftInput) {
    hueshiftInput.addEventListener('input', (e) => {
      const hueshiftValue = card.querySelector('.hueshift-value');
      if (hueshiftValue) {
        hueshiftValue.textContent = e.target.value;
      }
      debouncedApplyFilters(e);
    });
  }

  const flipSelect = card.querySelector('.flip-controls select');
  if (flipSelect) {
    flipSelect.addEventListener('change', (e) => {
      debouncedApplyFilters(e);
    });
  }

  const resizeWidthInput = card.querySelector('.resize-controls .resize-width-input');
  if (resizeWidthInput) {
    resizeWidthInput.addEventListener('input', (e) => {
      debouncedApplyFilters(e);
    });
  }

  const resizeHeightInput = card.querySelector('.resize-controls .resize-height-input');
  if (resizeHeightInput) {
    resizeHeightInput.addEventListener('input', (e) => {
      debouncedApplyFilters(e);
    });
  }


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
  applyFilters({ target: card.querySelector('.filter-checkbox') });

  return card;
}




async function handleFileInputChange(event) {
  const files = event.target.files;
  if (files.length > 0) {
    resultsDiv.classList.remove("empty-state");
    if (currentImages.length === 0) {
      const dropZone = resultsDiv.querySelector('.drop-zone');
      if (dropZone) {
        dropZone.remove();
      }
    }
    globalLightenControls.style.display = 'block';
    globalDarkenControls.style.display = 'block';
    globalRotateControls.style.display = 'block';
    globalBlurControls.style.display = 'block';
    globalThresholdControls.style.display = 'block';
    globalHueshiftControls.style.display = 'block';
  } else {
    // This happens when the user cancels the file dialog.
    // We don't need to do anything, the UI should stay as it is.
    return;
  }

  for (const file of files) {
    const originalBase64 = await fileToBase64(file);
    const imageCard = createImageCard(file, originalBase64);
    resultsDiv.appendChild(imageCard);
    currentImages.push({ file, card: imageCard });
  }

  updateGridLayout();

  const hasImages = currentImages.length > 0;
  exportPdfBtn.style.display = hasImages ? "inline" : "none";
  deleteAllBtn.style.display = hasImages ? "block" : "none";
  addImageBtn.style.display = hasImages ? "block" : "none";
  clearAllFiltersBtn.style.display = hasImages ? "block" : "none";
  event.target.value = "";
}

deleteAllBtn.addEventListener("click", () => {
  currentImages = [];
  resultsDiv.innerHTML = `
    <label for="fileInput" class="drop-zone">
      <p>Open an image to begin editing</p>
    </label>
  `;
  resultsDiv.className = "image-workspace empty-state";
  exportPdfBtn.style.display = "none";
  deleteAllBtn.style.display = "none";
  addImageBtn.style.display = "none";
  clearAllFiltersBtn.style.display = "none";

  // Hide global controls
  globalLightenControls.style.display = 'none';
  globalDarkenControls.style.display = 'none';
  globalRotateControls.style.display = 'none';
});

// Handle PDF export
exportPdfBtn.addEventListener("click", async () => {
  exportPdfBtn.disabled = true;
  exportPdfBtn.textContent = "Generating PDF...";

  const doc = new jsPDF();
  const imageCards = document.querySelectorAll('.image-card');
  let imageCount = 0;

  // Add title on the first page
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;
  doc.text("Image Processing App By Team 12", titleX, 15, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  for (const card of imageCards) {
    const originalImg = card.querySelector('.image-container:first-child img');
    const processedImg = card.querySelector('.processed-image');
    const filters = JSON.parse(card.dataset.filters || '[]');
    const fileName = card.dataset.fileName;

    if (processedImg && processedImg.src && processedImg.src.includes('base64')) {
      if (imageCount > 0) doc.addPage();

      doc.setFont("helvetica", "bold");
      doc.text("Original Image", 10, 40);
      doc.text("Processed Image", 105, 40);
      doc.setFont("helvetica", "normal");

      try {
        // Calculate aspect ratio for original image
        const origHeight = (originalImg.naturalHeight * 85) / originalImg.naturalWidth;
        doc.addImage(originalImg.src, 'PNG', 10, 50, 85, origHeight);

        // Calculate aspect ratio for processed image
        const procHeight = (processedImg.naturalHeight * 85) / processedImg.naturalWidth;
        doc.addImage(processedImg.src, 'PNG', 105, 50, 85, procHeight);

        // Add filter details
        let filterY = 50 + Math.max(origHeight, procHeight) + 10;
        doc.setFont("helvetica", "bold");
        doc.text("Applied Filters:", 10, filterY);
        doc.setFont("helvetica", "normal");
        filters.forEach(filter => {
          filterY += 7;
          let filterText = `- ${filter.name}`;
          if (filter.value) {
            if (typeof filter.value === 'object') {
              filterText += `: ${JSON.stringify(filter.value)}`;
            } else {
              filterText += `: ${filter.value}`;
            }
          }
          doc.text(filterText, 15, filterY);
        });

        // Add team members
        let membersY = filterY + 15;
        doc.setFont("helvetica", "bold");
        doc.text("Team Members:", 10, membersY);
        doc.setFont("helvetica", "normal");
        membersY += 7;
        doc.text("Ronard Ramos", 15, membersY);
        membersY += 7;
        doc.text("Jeffrey Revilla", 15, membersY);
        membersY += 7;
        doc.text("Andrei Ignacio", 15, membersY);

        imageCount++;
      } catch (e) {
        console.error("Error adding image to PDF:", e);
        // Add a placeholder or error message in the PDF
        doc.text("Error adding this image.", 10, 30);
      }
    }
  }

  // Add date and time at the bottom of the last page
  if (imageCount > 0) {
    const now = new Date();
    const dateTimeString = now.toLocaleString();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(`Processed on: ${dateTimeString}`, 10, pageHeight - 10);

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Store the blob globally for download
    currentPdfBlob = pdfBlob;
    console.log("PDF blob created and stored:", currentPdfBlob);

    const pdfFrame = document.getElementById("pdfFrame");
    pdfFrame.src = pdfUrl;

    const pdfPreview = document.getElementById("pdfPreview");
    pdfPreview.style.display = "block";
    
    // Hide the Export PDF button and show the Download PDF button
    exportPdfBtn.style.display = "none";
    downloadPdfFloatingBtn.style.display = "inline";
  } else {
    alert("No processed images to export!");
  }

  exportPdfBtn.disabled = false;
  exportPdfBtn.textContent = "Export PDF";
});

const downloadPdfBtn = document.getElementById("downloadPdfBtn");
downloadPdfBtn.addEventListener("click", async () => {
  console.log("Download button clicked");
  console.log("currentPdfBlob:", currentPdfBlob);
  
  if (currentPdfBlob) {
    try {
      // Create a temporary download link
      const url = window.URL.createObjectURL(currentPdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Image_Processing_Report_Team12.pdf';
      document.body.appendChild(link);
      
      console.log("Triggering download...");
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log("Download triggered successfully");
      alert("PDF download started!");
    } catch (error) {
      console.error("Error during download:", error);
      alert("Error downloading PDF: " + error.message);
    }
  } else {
    alert("No PDF to download. Please export a PDF first.");
  }
});

// Add event listener for floating download button
downloadPdfFloatingBtn.addEventListener("click", async () => {
  console.log("Floating download button clicked");
  console.log("currentPdfBlob:", currentPdfBlob);
  
  if (currentPdfBlob) {
    try {
      // Create a temporary download link
      const url = window.URL.createObjectURL(currentPdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Image_Processing_Report_Team12.pdf';
      document.body.appendChild(link);
      
      console.log("Triggering download...");
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log("Download triggered successfully");
      alert("PDF download started!");
    } catch (error) {
      console.error("Error during download:", error);
      alert("Error downloading PDF: " + error.message);
    }
  } else {
    alert("No PDF to download. Please export a PDF first.");
  }
});

const exitPdfPreviewBtn = document.getElementById("exitPdfPreviewBtn");
exitPdfPreviewBtn.addEventListener("click", () => {
  const pdfPreview = document.getElementById("pdfPreview");
  pdfPreview.style.display = "none";
  
  // Show the Export PDF button again and hide the Download button
  exportPdfBtn.style.display = "inline";
  downloadPdfFloatingBtn.style.display = "none";
});

fileInput.addEventListener("change", handleFileInputChange); 
addImageBtn.addEventListener("click", (e) => { 
  e.stopPropagation();
  fileInput.click(); 
});

clearAllFiltersBtn.addEventListener("click", () => {
  document.querySelectorAll('.image-card').forEach(card => {
    const clearFiltersBtn = card.querySelector('.clear-filters-btn');
    if (clearFiltersBtn) {
      clearFiltersBtn.click();
    }
  });
});


// --- Global Slider Event Listeners ---

function setupGlobalSlider(globalSlider, globalValue, filterType) {
  const debouncedApply = debounce(() => {
    const value = globalSlider.value;
    document.querySelectorAll('.image-card').forEach(card => {
      const filterCheckbox = card.querySelector(`.filter-checkbox[value="${filterType}"]`);
      const slider = card.querySelector(`.${filterType}-controls input`);
      
      if (slider) {
        // Check the filter checkbox
        if (filterCheckbox && !filterCheckbox.checked) {
          filterCheckbox.checked = true;
        }
        
        // Update the card's slider value
        slider.value = value;

        // Manually trigger the 'input' event on the individual slider
        // This will trigger the existing debounced `applyFilters`
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }, 250);

  globalSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    globalValue.textContent = value;
    
    // Also update the main sidebar slider for visual consistency
    const mainSidebarSlider = document.getElementById(`${filterType}-slider`);
    const mainSidebarValue = document.getElementById(`${filterType}-value`);
    if(mainSidebarSlider) mainSidebarSlider.value = value;
    if(mainSidebarValue) mainSidebarValue.textContent = value;

    debouncedApply();
  });
}

setupGlobalSlider(globalLightenSlider, globalLightenValue, 'lighten');
setupGlobalSlider(globalDarkenSlider, globalDarkenValue, 'darken');
setupGlobalSlider(globalRotateSlider, globalRotateValue, 'rotate');
setupGlobalSlider(globalBlurSlider, globalBlurValue, 'blur');
setupGlobalSlider(globalThresholdSlider, globalThresholdValue, 'threshold');
setupGlobalSlider(globalHueshiftSlider, globalHueshiftValue, 'hueshift');