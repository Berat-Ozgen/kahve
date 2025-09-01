/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import markdownit from 'markdown-it';
import { sanitizeHtml } from 'safevalues';
import { setElementInnerHtml } from 'safevalues/dom';

const md = markdownit();

const uploadContainer = document.getElementById('upload-container') as HTMLDivElement;
const imageUploadInput = document.getElementById('image-upload') as HTMLInputElement;
const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const resultContainer = document.getElementById('result-container') as HTMLDivElement;
const resultText = document.getElementById('result-text') as HTMLDivElement;
const resetButton = document.getElementById('reset-button') as HTMLButtonElement;
const moodSelectionContainer = document.getElementById('mood-selection') as HTMLDivElement;
const moodButtons = document.querySelectorAll('.mood-button') as NodeListOf<HTMLButtonElement>;
const shareButton = document.getElementById('share-button') as HTMLButtonElement;
const userInfoContainer = document.getElementById('user-info-container') as HTMLDivElement;
const userInfoInput = document.getElementById('user-info-input') as HTMLTextAreaElement;

let selectedMood = 'Genel'; // Default mood

/**
 * Converts a File object to a base64 string.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a fortune based on the uploaded coffee cup image and selected mood.
 */
async function generateFortune(imageDataUrl: string) {
  uploadContainer.classList.add('hidden');
  moodSelectionContainer.classList.add('hidden');
  userInfoContainer.classList.add('hidden');
  imagePreviewContainer.classList.add('hidden');
  resultContainer.classList.add('hidden');
  loader.classList.remove('hidden');

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // data:image/jpeg;base64,.... -> ["data:image/jpeg;base64,", "...."]
    const [header, data] = imageDataUrl.split(',');
    const mimeType = header.split(':')[1].split(';')[0];

    const imagePart = {
      inlineData: {
        mimeType,
        data,
      },
    };
    
    const userInfo = userInfoInput.value.trim();
    let promptText = `Bu kahve falını özellikle "${selectedMood}" konusu odaklı yorumla. Fincandaki şekilleri analiz et ve gelecekle ilgili olumlu ve yapıcı kehanetlerde bulun.`;
    
    if (userInfo) {
      promptText += ` Yorumunu yaparken şu kişisel bilgileri de dikkate al: "${userInfo}". Bu bilgilere dayanarak falı daha kişisel ve anlamlı hale getir.`;
    }

    promptText += " Cevabını markdown formatında, başlıklar ve paragraflar kullanarak organize et.";


    const textPart = {
      text: promptText
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: "Sen bilge ve gizemli bir kahve falcısısın. Yorumların her zaman nazik, umut verici ve eğlencelidir."
      }
    });

    const renderedMarkdown = md.render(response.text);
    setElementInnerHtml(resultText, sanitizeHtml(renderedMarkdown));
    resultContainer.classList.remove('hidden');

  } catch (error) {
    console.error(error);
    setElementInnerHtml(resultText, sanitizeHtml("<p class='error'>Fal yorumlanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>"));
    resultContainer.classList.remove('hidden');
  } finally {
    loader.classList.add('hidden');
  }
}

/**
 * Shares the fortune text using Web Share API or copies to clipboard.
 */
async function shareFortune() {
    const fortuneText = resultText.innerText;
    const buttonOriginalHTML = shareButton.innerHTML;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Sanal Kahve Falım',
                text: `İşte Sanal Kahve Falı'ndan gelen yorumum:\n\n${fortuneText}`,
            });
            shareButton.innerHTML = `<i class="fa-solid fa-check"></i> Paylaşıldı!`;
        } catch (error) {
            console.error('Paylaşım sırasında hata:', error);
            shareButton.innerHTML = `<i class="fa-solid fa-xmark"></i> Hata Oluştu`;
        }
    } else {
        try {
            await navigator.clipboard.writeText(fortuneText);
            shareButton.innerHTML = `<i class="fa-solid fa-copy"></i> Panoya Kopyalandı!`;
        } catch (error) {
            console.error('Kopyalama sırasında hata:', error);
            shareButton.innerHTML = `<i class="fa-solid fa-xmark"></i> Kopyalanamadı`;
        }
    }

    // Reset button text after a delay
    setTimeout(() => {
        shareButton.innerHTML = buttonOriginalHTML;
    }, 2000);
}


/**
 * Handles the image upload event.
 */
async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    const imageDataUrl = await fileToBase64(file);
    imagePreview.src = imageDataUrl;
    imagePreviewContainer.classList.remove('hidden');
    uploadContainer.classList.add('hidden');
    moodSelectionContainer.classList.add('hidden');
    userInfoContainer.classList.add('hidden');
    
    await generateFortune(imageDataUrl);
  }
}

/**
 * Handles mood selection.
 */
function handleMoodSelection(event: Event) {
  const target = event.currentTarget as HTMLButtonElement;
  
  // Update state
  selectedMood = target.dataset.mood || 'Genel';

  // Update UI
  moodButtons.forEach(button => button.classList.remove('active'));
  target.classList.add('active');
}

/**
 * Resets the UI to the initial state.
 */
function resetApp() {
    imageUploadInput.value = ''; // Reset file input
    userInfoInput.value = ''; // Reset textarea
    uploadContainer.classList.remove('hidden');
    moodSelectionContainer.classList.remove('hidden');
    userInfoContainer.classList.remove('hidden');
    imagePreviewContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    loader.classList.add('hidden');
}

// Event Listeners
imageUploadInput.addEventListener('change', handleImageUpload);
resetButton.addEventListener('click', resetApp);
shareButton.addEventListener('click', shareFortune);
moodButtons.forEach(button => {
  button.addEventListener('click', handleMoodSelection);
});