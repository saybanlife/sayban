import React from 'react';

// تعریف Interface برای پراپ‌های کامپوننت NotificationModal
interface NotificationModalProps {
  /**
   * تابعی که هنگام کلیک کاربر برای فعال‌سازی اعلان‌ها فراخوانی می‌شود.
   */
  handleEnableNotifications: () => void;

  /**
   * تابعی که هنگام کلیک کاربر برای بستن مودال یا انتخاب "بعداً" فراخوانی می‌شود.
   */
  handleLater: () => void;
}

/**
 * کامپوننت مودال برای درخواست اجازه فعال‌سازی اعلان‌ها از کاربر.
 * این مودال یک دکمه برای فعال‌سازی و یک دکمه برای رد کردن یا انتخاب "بعداً" دارد.
 */
const NotificationModal: React.FC<NotificationModalProps> = ({
  handleEnableNotifications,
  handleLater,
}) => {
  return (
    // لایه تاریک و نیمه‌شفاف که کل صفحه را می‌پوشاند
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // رنگ پس‌زمینه تیره با کمی شفافیت
        display: 'flex',
        justifyContent: 'center', // مرکز کردن افقی
        alignItems: 'center', // مرکز کردن عمودی
        zIndex: 1000, // اطمینان از اینکه مودال در بالاترین لایه قرار دارد
      }}
    >
      {/* باکس اصلی مودال */}
      <div
        style={{
          backgroundColor: 'white', // پس‌زمینه سفید برای باکس مودال
          padding: '32px 24px', // فاصله‌گذاری داخلی
          borderRadius: '24px', // گوشه‌های گرد
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', // سایه برای عمق بیشتر
          width: '340px', // عرض ثابت مودال
          textAlign: 'center', // متن‌ها در مرکز قرار می‌گیرند
          direction: 'rtl', // جهت از راست به چپ برای فارسی
          position: 'relative', // برای موقعیت‌دهی دکمه بستن
        }}
      >
        {/* دکمه بستن (ضربدر) در گوشه بالا سمت چپ */}
        <button
          onClick={handleLater}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'none', // بدون پس‌زمینه
            border: 'none', // بدون حاشیه
            fontSize: '18px', // اندازه فونت
            color: '#999', // رنگ خاکستری تیره
            cursor: 'pointer', // تغییر نشانگر ماوس به اشاره‌گر
          }}
          aria-label="بستن مودال" // برای دسترسی‌پذیری بهتر
        >
          ✕
        </button>

        {/* آیکون زنگوله در مرکز بالای مودال */}
        <div
          style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#8FAE55', // رنگ سبز برند شما
            borderRadius: '50%', // دایره‌ای کردن
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 20px auto', // قرارگیری در مرکز و فاصله از پایین
            boxShadow: '0 4px 12px rgba(143, 174, 85, 0.3)', // سایه با رنگ سبز
          }}
        >
          {/* آیکون زنگوله سفید رنگ */}
          <span role="img" aria-label="زنگوله" style={{ fontSize: '26px', color: 'white' }}>
            🔔
          </span>
        </div>

        {/* تیتر اصلی مودال */}
        <h3
          style={{
            margin: '0 0 12px 0', // فاصله از پایین
            color: '#1a1a1a', // رنگ تیره متن
            fontSize: '20px', // اندازه فونت
            fontWeight: 'bold', // ضخامت فونت
          }}
        >
          چیزی را از دست ندهید!
        </h3>

        {/* متن توضیحات مودال */}
        <p
          style={{
            margin: '0 0 24px 0', // فاصله از پایین
            color: '#666', // رنگ خاکستری متوسط
            fontSize: '14px', // اندازه فونت
            lineHeight: '1.7', // فاصله بین خطوط برای خوانایی بهتر
          }}
        >
          با فعال‌سازی اعلان‌ها، وضعیت رزروها و جشنواره‌های تخفیفی را فوراً به شما اطلاع می‌دهیم.
        </p>

        {/* دکمه اصلی: فعال‌سازی اعلان‌ها */}
        <button
          onClick={handleEnableNotifications}
          style={{
            width: '100%', // عرض کامل
            padding: '12px',
            backgroundColor: '#8FAE55', // رنگ سبز برند
            color: 'white', // رنگ متن سفید
            border: 'none', // بدون حاشیه
            borderRadius: '12px', // گوشه‌های گرد
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '12px', // فاصله از دکمه پایین
            transition: 'background 0.2s', // انیمیشن نرم هنگام هاور
          }}
          aria-label="فعال‌سازی اعلان‌ها"
        >
          فعال‌سازی اعلان‌ها
        </button>

        {/* دکمه دوم: بعداً شاید */}
        <button
          onClick={handleLater}
          style={{
            width: '100%', // عرض کامل
            padding: '12px',
            backgroundColor: 'transparent', // پس‌زمینه شفاف
            color: '#8FAE55', // رنگ متن سبز برند
            border: '2px solid #8FAE55', // حاشیه سبز همرنگ متن
            borderRadius: '12px', // گوشه‌های گرد
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
          aria-label="بعداً شاید"
        >
          بعداً شاید
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;
