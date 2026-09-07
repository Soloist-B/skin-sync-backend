"use client";

import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // สร้าง State เพื่อสลับโหมดระหว่าง 'camera' และ 'upload'
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  
  // State สำหรับเก็บรูปภาพที่อัปโหลด
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // ฟังก์ชันหลักสำหรับส่งรูป (Blob/File) ไปยัง API
  const sendToAPI = async (fileBlob: Blob) => {
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", fileBlob, "image.jpg");

      // เปลี่ยน IP กลับเป็น 127.0.0.1 สำหรับเทสในคอม
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
      setResult({ status: "error", message: "ไม่สามารถเชื่อมต่อ Server ได้" });
    } finally {
      setLoading(false);
    }
  };

  // 1. ฟังก์ชันเมื่อกดสแกนจากกล้อง
  const captureAndPredict = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    // แปลง base64 เป็น Blob แล้วส่งไป API
    fetch(imageSrc)
      .then((res) => res.blob())
      .then((blob) => sendToAPI(blob));
  };

  // 2. ฟังก์ชันเมื่อเลือกไฟล์รูปภาพ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file)); // สร้าง URL เพื่อพรีวิวรูป
      setResult(null); // ล้างผลลัพธ์เก่า
    }
  };

  // 3. ฟังก์ชันเมื่อกดสแกนรูปที่อัปโหลด
  const uploadAndPredict = () => {
    if (!selectedFile) return;
    sendToAPI(selectedFile);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-10 bg-gray-100">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">ระบบวิเคราะห์สิว (AI)</h1>
        
        {/* ปุ่มสลับโหมด */}
        <div className="flex w-full mb-6 bg-gray-200 rounded-lg p-1">
          <button
            onClick={() => setMode("camera")}
            className={`flex-1 py-2 rounded-md font-medium transition-all ${
              mode === "camera" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            ใช้กล้อง
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`flex-1 py-2 rounded-md font-medium transition-all ${
              mode === "upload" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            อัปโหลดรูป
          </button>
        </div>

        {/* ส่วนแสดงผลตามโหมดที่เลือก */}
        {mode === "camera" ? (
          <div className="w-full flex flex-col items-center">
            <div className="rounded-xl overflow-hidden mb-4 border-4 border-gray-200 w-full">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full"
              />
            </div>
            <button
              onClick={captureAndPredict}
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-all ${
                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "กำลังวิเคราะห์..." : "สแกนใบหน้า"}
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {imagePreview ? (
              <div className="mb-4 rounded-xl overflow-hidden border-4 border-gray-200 w-full">
                <img src={imagePreview} alt="Preview" className="w-full h-auto" />
              </div>
            ) : (
              <div className="mb-4 w-full h-48 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400">
                ยังไม่ได้เลือกรูปภาพ
              </div>
            )}
            
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mb-4 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            <button
              onClick={uploadAndPredict}
              disabled={loading || !selectedFile}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-all ${
                loading || !selectedFile ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "กำลังวิเคราะห์..." : "สแกนรูปภาพนี้"}
            </button>
          </div>
        )}

        {/* แสดงผลลัพธ์ (อัปเดตสำหรับ 7 Classes) */}
        {result && (
          <div className="mt-6 w-full">
            {result.status === "success" ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* หัวข้อผลลัพธ์ (เปลี่ยนสีตามการพบปัญหา) */}
                <div className={`p-4 text-center font-bold text-white ${result.detected_count > 0 ? 'bg-red-500' : 'bg-teal-500'}`}>
                  {result.message}
                </div>
                
                {/* แสดงกราฟแท่งทั้ง 7 คลาส */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm">เปอร์เซ็นต์การวิเคราะห์ผิว (Threshold 20%):</h3>
                  <div className="space-y-3">
                    {result.all_scores.map((item: any, index: number) => {
                      const isDetected = item.probability >= 0.20;
                      const percent = (item.probability * 100).toFixed(1);
                      return (
                        <div key={index}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={isDetected ? "font-bold text-red-600" : "text-gray-600"}>
                              {item.class_name}
                            </span>
                            <span className={isDetected ? "font-bold text-red-600" : "text-gray-600"}>
                              {percent}%
                            </span>
                          </div>
                          {/* หลอดเปอร์เซ็นต์ */}
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${isDetected ? 'bg-red-500' : 'bg-teal-400'}`}
                              style={{ width: `${Math.min(Number(percent), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center border border-red-200">
                {result.message || "เกิดข้อผิดพลาดในการวิเคราะห์"}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}