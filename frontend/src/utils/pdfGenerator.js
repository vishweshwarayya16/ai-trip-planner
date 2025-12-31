import jsPDF from 'jspdf';
import 'jspdf-autotable';
import fontRegular from "../fonts/NotoSans-Regular.js";
import fontBold from "../fonts/NotoSans-Bold.js";

// Keeping function as you said (unused)
const cleanText = (text) => text;

export const generateTripPDF = (tripDetails, tripInfo = {}) => {
  const doc = new jsPDF();

  // Register Unicode fonts
  doc.addFileToVFS("NotoSans-Regular.ttf", fontRegular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");

  doc.addFileToVFS("NotoSans-Bold.ttf", fontBold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");

  // Set default font
  doc.setFont("NotoSans", "normal");

  // Colors
  const primaryColor = [102, 126, 234];
  const secondaryColor = [118, 75, 162];
  const textColor = [51, 51, 51];
  const lightGray = [245, 245, 245];
  const accentRed = [239, 68, 68];

  let yPosition = 20;

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("NotoSans", "bold");
  doc.text('AI TRIP PLANNER', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont("NotoSans", "normal");
  doc.text('Your Personalized Travel Itinerary', 105, 30, { align: 'center' });

  yPosition = 50;

  // Trip Info Box
  if (tripInfo.destination || tripInfo.startDate) {
    doc.setFillColor(...lightGray);
    doc.roundedRect(15, yPosition, 180, 35, 3, 3, 'F');

    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont("NotoSans", "bold");

    let infoY = yPosition + 8;

    if (tripInfo.destination) {
      doc.text(`Destination: ${tripInfo.destination}`, 20, infoY);
      infoY += 7;
    }
    if (tripInfo.startDate && tripInfo.endDate) {
      doc.text(`Dates: ${tripInfo.startDate} to ${tripInfo.endDate}`, 20, infoY);
      infoY += 7;
    }
    if (tripInfo.travelers) {
      doc.text(`Number of Travelers: ${tripInfo.travelers}`, 20, infoY);
      infoY += 7;
    }
    if (tripInfo.mood) {
      doc.text(`Travel Focus: ${tripInfo.mood}`, 20, infoY);
    }

    yPosition += 40;
  }

  // Split lines
  const lines = tripDetails.split('\n');
  doc.setTextColor(...textColor);

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      yPosition += 3;
      continue;
    }

    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    // H1 (#)
    if (line.startsWith('# ')) {
      yPosition += 5;
      doc.setFillColor(...primaryColor);
      doc.rect(15, yPosition - 5, 180, 10, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("NotoSans", "bold");

      const text = line.replace('# ', '');
      const split = doc.splitTextToSize(text, 180);

      doc.text(split, 105, yPosition, { align: 'center' });

      yPosition += 10;
      doc.setTextColor(...textColor);
      continue;
    }

    // H2 (##)
    if (line.startsWith('## ')) {
      yPosition += 5;
      doc.setFontSize(14);
      doc.setFont("NotoSans", "bold");
      doc.setTextColor(...primaryColor);

      const text = line.replace('## ', '');
      const split = doc.splitTextToSize(text, 175);

      doc.text(split, 15, yPosition);
      yPosition += split.length * 7 + 3;

      doc.setTextColor(...textColor);
      continue;
    }

    // H3 (###)
    if (line.startsWith('### ')) {
      yPosition += 3;
      doc.setFontSize(12);
      doc.setFont("NotoSans", "bold");
      doc.setTextColor(...secondaryColor);

      const text = line.replace('### ', '');
      const split = doc.splitTextToSize(text, 175);

      doc.text(split, 15, yPosition);
      yPosition += split.length * 6 + 2;

      doc.setTextColor(...textColor);
      continue;
    }

    // Divider
    if (line.startsWith('---')) {
      yPosition += 3;
      doc.setDrawColor(...primaryColor);
      doc.line(15, yPosition, 195, yPosition);
      yPosition += 5;
      continue;
    }

    // Bold (**text**)
    if (line.includes('**')) {
      doc.setFontSize(10);

      let output = '';
      let parts = line.split('**');
      let bold = false;

      for (let part of parts) {
        if (bold) {
          doc.setFont("NotoSans", "bold");
        } else {
          doc.setFont("NotoSans", "normal");
        }
        output += part;
        bold = !bold;
      }

      const split = doc.splitTextToSize(output, 175);
      doc.text(split, 15, yPosition);
      yPosition += split.length * 5 + 3;

      continue;
    }

    // Bullets
    if (line.startsWith('- ') || line.startsWith('* ')) {
      doc.setFontSize(10);
      doc.setFont("NotoSans", "normal");

      const text = line.replace(/^[-*]\s/, '');

      doc.circle(22, yPosition - 1.5, 0.8, 'F');

      const split = doc.splitTextToSize(text, 165);
      doc.text(split, 27, yPosition);

      yPosition += split.length * 5 + 2;
      continue;
    }

    // Numbered list
    if (/^\d+\./.test(line)) {
      doc.setFontSize(10);
      doc.setFont("NotoSans", "normal");

      const split = doc.splitTextToSize(line, 170);
      doc.text(split, 20, yPosition);

      yPosition += split.length * 5 + 2;
      continue;
    }

    // Normal text
    doc.setFontSize(10);
    doc.setFont("NotoSans", "normal");

    const split = doc.splitTextToSize(line, 175);
    doc.text(split, 15, yPosition);

    yPosition += split.length * 5 + 2;
  }

  // FOOTER
  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 283, 195, 283);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("NotoSans", "normal");

    doc.text(
      `Generated by AI Trip Planner | Page ${i} of ${pageCount}`,
      105, 287, { align: 'center' }
    );

    doc.text(
      `Generated on: ${new Date().toLocaleDateString('en-IN')}`,
      105, 291, { align: 'center' }
    );
  }

  const cleanDestination = tripInfo.destination
    ? tripInfo.destination.replace(/[^a-zA-Z0-9]/g, '_')
    : 'Destination';

  const fileName =
    `Trip_to_${cleanDestination}_${new Date()
      .toLocaleDateString('en-IN')
      .replace(/\//g, '-')}.pdf`;

  doc.save(fileName);
};

export const generateTripPDFFromSaved = (tripDetails, tripInfo = {}) => {
  generateTripPDF(tripDetails, tripInfo);
};
