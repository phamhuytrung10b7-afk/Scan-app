import { GoogleGenAI } from "@google/genai";
import { SerialUnit, Product } from './types';

export const getInventoryInsight = async (products: Product[], units: SerialUnit[]): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "Không tìm thấy API Key.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare data summary for AI
    const summary = products.map(p => {
      const stock = units.filter(u => u.productId === p.id && u.status === 'NEW').length;
      return `${p.model}: ${stock} units in stock.`;
    }).join('\n');

    const prompt = `
      Bạn là chuyên gia quản lý kho máy lọc nước RO (RO Water Purifier). Hãy phân tích dữ liệu tồn kho sau:
      ${summary}
      
      Hãy đưa ra nhận định ngắn gọn, chuyên nghiệp bằng TIẾNG VIỆT (tối đa 3 câu).
      Xác định ngay các model đang thiếu hàng và đề xuất hành động nhập hàng.
      Nếu mọi thứ ổn định, hãy khen ngợi model bán chạy nhất.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Hiện không có nhận định nào.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Tạm thời không thể kết nối AI.";
  }
};