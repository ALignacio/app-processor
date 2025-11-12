const { jsPDF } = require('jspdf');

let fileInput = document.getElementById("fileInput");
const resultsDiv = document.getElementById("results");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const addImageBtn = document.getElementById("addImageBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");

const globalLightenSlider = document.getElementById('global-lighten-slider');
const globalLightenValue = document.getElementById('global-lighten-value');
const globalDarkenSlider = document.getElementById('global-darken-slider');
const globalDarkenValue = document.getElementById('global-darken-value');
const globalRotateSlider = document.getElementById('global-rotate-slider');
const globalRotateValue = document.getElementById('global-rotate-value');

const globalLightenControls = document.getElementById('global-lighten-controls');
const globalDarkenControls = document.getElementById('global-darken-controls');
const globalRotateControls = document.getElementById('global-rotate-controls');

let currentImages = [];

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
  processedLabel.style.display = "none"; // Initially hide the processed label
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

  // Filter checkboxes for this image
  const cardFiltersContainer = document.createElement("div");
  cardFiltersContainer.className = "filters-container";
  cardFiltersContainer.innerHTML = document.getElementById("filters-container").innerHTML; // Copy global filters
  
  const clearFiltersBtn = document.createElement("button");
  clearFiltersBtn.textContent = "Clear Filters";
  clearFiltersBtn.className = "clear-filters-btn";

  // Sliders container
  const slidersContainer = document.createElement("div");
  slidersContainer.className = "sliders-container";
  card.appendChild(slidersContainer);

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

  // Download buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "buttons-container";
  
  const downloadPngBtn = document.createElement("button");
  downloadPngBtn.textContent = "Download PNG";
  const downloadJpgBtn = document.createElement("button");
  downloadJpgBtn.textContent = "Download JPG";

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "delete-btn"; // Add a class for styling and identification

  buttonsContainer.appendChild(cardFiltersContainer);
  buttonsContainer.appendChild(clearFiltersBtn);
  buttonsContainer.appendChild(downloadPngBtn);
  buttonsContainer.appendChild(downloadJpgBtn);
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
      
      resultsDiv.classList.add("empty-state");
      resultsDiv.innerHTML = `
        <label class="drop-zone">
          <input type="file" id="fileInput" multiple accept="image/*" />
          <p>Open an image to begin editing</p>
        </label>
      `;
      fileInput = document.getElementById("fileInput");
      fileInput.addEventListener("change", handleFileInputChange);
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

  // Add event listener for filter changes
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
      resultsDiv.innerHTML = ''; // Clear the "Open an image" message
    }
    globalLightenControls.style.display = 'block';
    globalDarkenControls.style.display = 'block';
    globalRotateControls.style.display = 'block';
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

  const hasImages = currentImages.length > 0;
  exportPdfBtn.style.display = hasImages ? "inline" : "none";
  deleteAllBtn.style.display = hasImages ? "block" : "none";
  addImageBtn.style.display = hasImages ? "block" : "none";
}

deleteAllBtn.addEventListener("click", () => {
  currentImages = [];
  resultsDiv.innerHTML = `
    <label class="drop-zone">
      <input type="file" id="fileInput" multiple accept="image/*" />
      <p>Open an image to begin editing</p>
    </label>
  `;
  resultsDiv.classList.add("empty-state");
  exportPdfBtn.style.display = "none";
  deleteAllBtn.style.display = "none";
  addImageBtn.style.display = "none";

  // Hide global controls
  globalLightenControls.style.display = 'none';
  globalDarkenControls.style.display = 'none';
  globalRotateControls.style.display = 'none';

  fileInput = document.getElementById("fileInput");
  fileInput.addEventListener("change", handleFileInputChange);
});

// Handle global filter changes
document.querySelectorAll('#filters-container .filter-checkbox').forEach(checkbox => {
  checkbox.addEventListener('change', (e) => {
    const filterType = e.target.value;
    const isChecked = e.target.checked;
    document.querySelectorAll('.image-card').forEach(card => {
      const cardCheckbox = card.querySelector(`.filter-checkbox[value="${filterType}"]`);
      if (cardCheckbox) {
        cardCheckbox.checked = isChecked;
        cardCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
});

// Handle PDF export
exportPdfBtn.addEventListener("click", async () => {
  exportPdfBtn.disabled = true;
  exportPdfBtn.textContent = "Generating PDF...";

  const doc = new jsPDF();
  const imageCards = document.querySelectorAll('.image-card');
  let imageCount = 0;

  for (const card of imageCards) {
    const originalImg = card.querySelector('.image-container:first-child img');
    const processedImg = card.querySelector('.processed-image');
    const filters = JSON.parse(card.dataset.filters || '[]');
    const fileName = card.dataset.fileName;

    if (processedImg && processedImg.src && processedImg.src.includes('base64')) {
      if (imageCount > 0) doc.addPage();

      doc.text(`Image: ${fileName}`, 10, 10);
      doc.text("Original Image", 10, 20);
      const appliedFilters = filters.map(f => f.name).join(', ');
      doc.text(`Processed Image (${appliedFilters})`, 105, 20);

      try {
        // Calculate aspect ratio for original image
        const origHeight = (originalImg.naturalHeight * 85) / originalImg.naturalWidth;
        doc.addImage(originalImg.src, 'PNG', 10, 30, 85, origHeight);

        // Calculate aspect ratio for processed image
        const procHeight = (processedImg.naturalHeight * 85) / processedImg.naturalWidth;
        doc.addImage(processedImg.src, 'PNG', 105, 30, 85, procHeight);

        imageCount++;
      } catch (e) {
        console.error("Error adding image to PDF:", e);
        // Add a placeholder or error message in the PDF
        doc.text("Error adding this image.", 10, 30);
      }
    }
  }

  if (imageCount > 0) {
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const pdfFrame = document.getElementById("pdfFrame");
    pdfFrame.src = pdfUrl;

    const pdfPreview = document.getElementById("pdfPreview");
    pdfPreview.style.display = "block";
    pdfPreview.dataset.pdfBlob = pdfUrl;
  } else {
    alert("No processed images to export!");
  }

  exportPdfBtn.disabled = false;
  exportPdfBtn.textContent = "Export PDF";
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

const exitPdfPreviewBtn = document.getElementById("exitPdfPreviewBtn");
exitPdfPreviewBtn.addEventListener("click", () => {
  const pdfPreview = document.getElementById("pdfPreview");
  pdfPreview.style.display = "none";
});

fileInput.addEventListener("change", handleFileInputChange);

addImageBtn.addEventListener("click", () => {
  const tempInput = document.createElement('input');
  tempInput.type = 'file';
  tempInput.multiple = true;
  tempInput.accept = 'image/*';
  tempInput.style.display = 'none';
  tempInput.addEventListener('change', (event) => {
    handleFileInputChange(event);
    document.body.removeChild(tempInput); // Clean up
  });
  document.body.appendChild(tempInput);
  tempInput.click();
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
