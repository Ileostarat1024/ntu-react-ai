// OpenAI 寫在這裡（API也在裡面）
import openai from "@/services/openai";
import db from "@/services/db";

export async function GET() {
  // 取得集合內所有文件
  const docList = await db
    .collection("vocab-ai")
    .orderBy("createdAt", "desc")
    .get();
  // 準備要回應給前端的資料(後端一定要給前端資料)
  const vocabList = [];
  // 檢查每個 doc 內容，可以用 thunder client 檢查
  // 發現 doc 內容變成 firestore 的文件格式
  // doc.id 文件ID
  // doc.data() 當初存入的物件
  docList.forEach((doc) => {
    const result = doc.data();
    console.log("result: ", result);
    vocabList.push(result);
  });
  // Response 物件會把 json 內容做成前端看得懂的格式
  return Response.json(vocabList);
}

export async function POST(req) {
  const body = await req.json();
  console.log("body:", body);
  const { userInput, language } = body;
  // DONE: 透過gpt-4o-mini模型讓AI回傳相關單字
  // 要根據指定的格式下指令
  // 文件連結：https://platform.openai.com/docs/guides/text-generation/chat-completions-api?lang=node.js
  // JSON Mode(產生指定格式): https://platform.openai.com/docs/guides/text-generation/json-mode?lang=node.js
  // back-tick 支援字串換行
  const systemPrompt = `請作為一個單字聯想AI根據所提供的單字聯想5個相關單字，並提供對應的繁體中文意思
  例如：
  單字：水果
  語言：英文
  回應JSON範例：
  {
    wordList: [apple, banana,...],
    zhWordList: [ 蘋果, 香蕉,...]
  }
  
  `;
  const propmpt = `單字：${userInput}
  語言：${language}`;

  const openAIReqBody = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: propmpt },
    ],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
  };
  const completion = await openai.chat.completions.create(openAIReqBody);
  // const payload = completion.choices[0].message.content;
  const payload = JSON.parse(completion.choices[0].message.content);
  console.log("payload:", payload);

  // 最後要回傳給前端的資料
  const result = {
    title: userInput,
    payload,
    language,
    createdAt: new Date().getTime(),
  };
  // 將 result 存到 db 中 vocab-ai 的集合
  const firestoreRes = await db.collection("vocab-ai").add(result);
  console.log("新增的文件ID:", firestoreRes.id);

  return Response.json(result);
}
