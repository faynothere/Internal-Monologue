// SillyTavern/public/extensions/internal_monologue/index.js

(function () {
    // ----------------------------------------------------------------
    // ⚙️ ส่วนตั้งค่า
    // ----------------------------------------------------------------

    // นี่คือ "Prompt" หรือคำสั่งที่เราจะแอบส่งไปหา AI
    // คุณสามารถแก้ไขข้อความนี้ได้ตามใจชอบ
    const settings = {
        getMonologuePrompt: (characterName) => 
            `[System Note: This is a secret request for an internal monologue. ${characterName}, what are you thinking or feeling right now? Describe your current thoughts, emotions, or secret intentions briefly. Do not write this as dialogue. Just state your thoughts directly.]`
    };

    // ----------------------------------------------------------------
    // 🎨 ฟังก์ชันเพิ่มปุ่ม UI
    // ----------------------------------------------------------------
    function addMindReadButton() {
        const iconHtml = `<i class="fa-solid fa-brain"></i>`; // ไอคอนรูปสมอง

        // ใช้ 'addIconToInteractBar' ของ SillyTavern
        addIconToInteractBar(
            "internal-monologue-btn", // ID ของปุ่ม
            iconHtml, // HTML ของไอคอน
            "Read Character's Thoughts", // Tooltip (ข้อความពេលเอาเมาส์ชี้)
            onReadMindClick, // ฟังก์ชันที่จะเรียกเมื่อคลิก
            null // ไม่มีเมนูย่อย
        );
    }

    // ----------------------------------------------------------------
    // 🧠 ฟังก์ชันหลัก: เมื่อปุ่มถูกคลิก
    // ----------------------------------------------------------------
    async function onReadMindClick() {
        console.log("Internal Monologue: Button clicked!");

        // 1. แสดงหน้าต่าง "กำลังโหลด..."
        toastr.info("Asking for internal thoughts...", "Reading Mind", { timeOut: 3500 });

        try {
            // 2. ดึงข้อมูลบริบทปัจจุบัน
            const context = getContext();
            if (!context || !context.api || !context.api.generate) {
                toastr.error("Internal Monologue: Cannot access SillyTavern API context.");
                return;
            }

            const characterName = context.character.name;
            const instruction = settings.getMonologuePrompt(characterName);

            // 3. สร้าง "ประวัติแชทจำลอง" เพื่อส่งไป
            // เราคัดลอกประวัติแชทจริงมา
            const tempChatHistory = [...context.chat];
            
            // 4. เพิ่มคำสั่งของเราเข้าไปเป็น "ข้อความล่าสุด" (แบบปลอมๆ)
            tempChatHistory.push({
                is_user: true,
                mes: instruction
            });

            // 5. เตรียมตัวเลือกในการ Generate (ใช้การตั้งค่าปัจจุบันของผู้ใช้)
            const generateOptions = {
                prompt: tempChatHistory, 
                temperature: context.generation_settings.temperature,
                max_length: context.generation_settings.max_length,
                top_p: context.generation_settings.top_p,
                top_k: context.generation_settings.top_k,
                typical_p: context.generation_settings.typical_p,
                rep_pen: context.generation_settings.rep_pen,
                // ... และการตั้งค่าอื่นๆ ที่จำเป็น
                stream: false, // เราต้องการคำตอบเต็มๆ
            };
            
            // 6. สั่งยิง API! (แบบไม่บันทึกลงแชท)
            const response = await context.api.generate(generateOptions);

            // 7. ดึงข้อความจากคำตอบ (รองรับหลาย API)
            let thought = "";
            if (response.text) {
                thought = response.text; // สำหรับ Kobold/Ooba
            } else if (response.choices && response.choices[0]) {
                if (response.choices[0].message) {
                    thought = response.choices[0].message.content; // OpenAI
                } else {
                    thought = response.choices[0].text; // OpenAI (เก่า)
                }
            }

            // 8. แสดงผลลัพธ์ใน Pop-up! (ใช้ SweetAlert2)
            Swal.fire({
                title: `<strong>${characterName}'s Thoughts</strong>`,
                html: thought || "(No thoughts received...)",
                width: '600px',
                confirmButtonText: 'Close',
                // ใช้ Class จาก CSS ที่เราสร้าง
                customClass: {
                    htmlContainer: 'monologue-popup-content'
                }
            });

        } catch (err) {
            console.error("Internal Monologue Error:", err);
            toastr.error("Failed to read thoughts: " + (err.message || "Unknown error"));
        }
    }

    // ----------------------------------------------------------------
    // 🚀 ฟังก์ชันเริ่มการทำงาน (เมื่อโหลด Extension)
    // ----------------------------------------------------------------
    function initializeExtension() {
        // เราต้องรอให้ UI ของ SillyTavern โหลดเสร็จก่อน
        // เราจะเช็คทุกๆ 100ms จนกว่าจะเจอ 'send_form' และฟังก์ชัน 'addIconToInteractBar'
        const interval = setInterval(() => {
            if (document.getElementById('send_form') && typeof addIconToInteractBar === 'function') {
                clearInterval(interval); // หยุดการเช็ค
                addMindReadButton(); // เพิ่มปุ่มของเรา!
                console.log("Internal Monologue: Button added!");
            }
        }, 100);
    }

    // เริ่มทำงาน
    initializeExtension();

})();
