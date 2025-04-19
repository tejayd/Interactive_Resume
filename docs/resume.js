// PDF Viewer Implementation with Page-Turning Effect
const url = 'resume.pdf';
let pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 1.2,
    canvas = document.getElementById('pdf-render'),
    ctx = canvas.getContext('2d');

// Initialize PDF.js
const pdfjsLib = window.pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.js';

/**
 * Get the PDF document and initialize everything
 */
async function initPDF() {
  try {
    pdfDoc = await pdfjsLib.getDocument(url).promise;
    document.getElementById('page-total').textContent = pdfDoc.numPages;
    
    // Initial render
    renderPage(pageNum);
    
    // Set up button event listeners
    document.getElementById('prev-page').addEventListener('click', onPrevPage);
    document.getElementById('next-page').addEventListener('click', onNextPage);
  } catch (error) {
    console.error('Error loading PDF:', error);
    const pdfViewer = document.querySelector('.pdf-viewer');
    if (pdfViewer) {
      pdfViewer.innerHTML = `<div class="pdf-error">Error loading PDF. Please try again later.</div>`;
    }
  }
}

/**
 * Render the page with animation
 */
function renderPage(num) {
  pageRendering = true;
  document.getElementById('page-current').textContent = num;
  
  // Update button states
  updateButtonStates();
  
  // Get page
  pdfDoc.getPage(num).then(function(page) {
    // Add page-turning animation
    const pdfViewer = document.querySelector('.pdf-viewer');
    pdfViewer.classList.add('page-turning');
    
    // Calculate scaled viewport
    const viewport = page.getViewport({scale});
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render PDF page into canvas context
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    
    const renderTask = page.render(renderContext);
    
    // Wait for rendering to finish
    renderTask.promise.then(function() {
      pageRendering = false;
      // Remove animation class after animation completes
      setTimeout(() => {
        pdfViewer.classList.remove('page-turning');
      }, 500);
      
      // If another page is pending, render it
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });
}

/**
 * Queue the next page to be rendered
 */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Go to previous page
 */
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}

/**
 * Go to next page
 */
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}

/**
 * Update button states based on current page
 */
function updateButtonStates() {
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');
  
  prevButton.disabled = pageNum <= 1;
  nextButton.disabled = pageNum >= pdfDoc.numPages;
}

// Initialize the PDF viewer when the document is loaded
document.addEventListener('DOMContentLoaded', initPDF);