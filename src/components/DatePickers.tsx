import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Picker from 'rmc-picker';
import Jalaali from 'jalaali-js';
import { CodeComponentMeta } from '@plasmicapp/host';
import 'rmc-picker/assets/index.css';

type DatePickersProps = {
  onChange?: (values: { 
    day: number; 
    month: number; 
    year: number; 
    gregorian: { day: number; month: number; year: number } 
  }) => void;
  SelectedDay?: number;
  SelectedMonth?: number;
  SelectedYear?: number;
  selectedValues?: { day: number; month: number; year: number };
  customYears?: { value: number; label: string }[];
  className?: string;
  hideYear?: boolean;
  disablePastDates?: boolean; // ✅ پراپ جدید برای فعال/غیرفعال کردن این ویژگی
};

export const DatePickers = (props: DatePickersProps) => {
  const {
    onChange,
    SelectedDay = 5,
    SelectedMonth = 10,
    SelectedYear = 1403,
    customYears = [],
    className,
    hideYear = false,
    disablePastDates = false, // ✅ مقدار پیش‌فرض غیرفعال است تا رفتار قبلی حفظ شود
  } = props;

  // محاسبه تاریخ امروز به جلالی
  const todayJalaali = useMemo(() => {
    return Jalaali.toJalaali(new Date());
  }, []);

  const [selectedDay, setSelectedDay] = useState<number>(SelectedDay);
  const [selectedMonth, setSelectedMonth] = useState<number>(SelectedMonth);
  const [selectedYear, setSelectedYear] = useState<number>(SelectedYear);

  const toPersianDigits = (num: number | string): string => {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    return num.toString().replace(/\d/g, (digit) => persianDigits[parseInt(digit, 10)]);
  };

  // فیلتر کردن روزهای ماه
  const getDaysOfMonth = (month: number, year: number) => {
    const daysInMonth = Jalaali.jalaaliMonthLength(year, month);
    let startDay = 1;

    // اعمال محدودیت فقط در صورت فعال بودن پراپ
    if (disablePastDates && year === todayJalaali.jy && month === todayJalaali.jm) {
      startDay = todayJalaali.jd;
    }

    return Array.from({ length: daysInMonth - startDay + 1 }, (_, i) => {
      const dayValue = startDay + i;
      return {
        value: dayValue,
        label: toPersianDigits(dayValue),
      };
    });
  };

  const currentYear = todayJalaali.jy;

  // فیلتر کردن ماه‌ها
  const months = useMemo(() => {
    const allMonths = [
      { value: 1, label: 'فروردین' },
      { value: 2, label: 'اردیبهشت' },
      { value: 3, label: 'خرداد' },
      { value: 4, label: 'تیر' },
      { value: 5, label: 'مرداد' },
      { value: 6, label: 'شهریور' },
      { value: 7, label: 'مهر' },
      { value: 8, label: 'آبان' },
      { value: 9, label: 'آذر' },
      { value: 10, label: 'دی' },
      { value: 11, label: 'بهمن' },
      { value: 12, label: 'اسفند' },
    ];

    // اعمال محدودیت فقط در صورت فعال بودن پراپ
    if (disablePastDates && selectedYear === todayJalaali.jy) {
      return allMonths.filter((m) => m.value >= todayJalaali.jm);
    }
    return allMonths;
  }, [selectedYear, todayJalaali, disablePastDates]);

  // فیلتر کردن سال‌ها
  const years = useMemo(() => {
    if (customYears.length > 0) {
      if (disablePastDates) {
        return customYears.filter((y) => y.value >= todayJalaali.jy);
      }
      return customYears;
    }
    
    if (disablePastDates) {
      // اگر محدودیت فعال باشد: از امسال تا ۲۰ سال آینده
      const futureRange = 20; 
      return Array.from({ length: futureRange }, (_, i) => {
        const year = todayJalaali.jy + i;
        return { value: year, label: toPersianDigits(year) };
      });
    } else {
      // حالت قبلی: از ۱۳۰۰ تا سال جاری
      return Array.from({ length: currentYear - 1300 + 1 }, (_, i) => {
        const year = 1300 + i;
        return { value: year, label: toPersianDigits(year) };
      });
    }
  }, [customYears, todayJalaali, disablePastDates, currentYear]);

  // ناظر بر اصلاح خودکار مقادیر غیرمجاز
  useEffect(() => {
    if (!disablePastDates) return; // اگر محدودیت غیرفعال است، نیازی به اعتبارسنجی نیست

    let correctedYear = selectedYear;
    let correctedMonth = selectedMonth;
    let correctedDay = selectedDay;

    if (selectedYear < todayJalaali.jy) {
      correctedYear = todayJalaali.jy;
    }

    if (correctedYear === todayJalaali.jy && selectedMonth < todayJalaali.jm) {
      correctedMonth = todayJalaali.jm;
    }

    if (correctedYear === todayJalaali.jy && correctedMonth === todayJalaali.jm && selectedDay < todayJalaali.jd) {
      correctedDay = todayJalaali.jd;
    }

    const maxDays = Jalaali.jalaaliMonthLength(correctedYear, correctedMonth);
    if (correctedDay > maxDays) {
      correctedDay = maxDays;
    }

    if (
      correctedYear !== selectedYear ||
      correctedMonth !== selectedMonth ||
      correctedDay !== selectedDay
    ) {
      setSelectedYear(correctedYear);
      setSelectedMonth(correctedMonth);
      setSelectedDay(correctedDay);
    }
  }, [selectedYear, selectedMonth, selectedDay, todayJalaali, disablePastDates]);

  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const gregorian = Jalaali.toGregorian(selectedYear, selectedMonth, selectedDay);
    const values = { 
      day: selectedDay, 
      month: selectedMonth, 
      year: selectedYear,
      gregorian: {
        day: gregorian.gd,
        month: gregorian.gm,
        year: gregorian.gy
      }
    };
    if (onChangeRef.current) {
      onChangeRef.current(values);
    }
  }, [selectedDay, selectedMonth, selectedYear]);

  // مقداردهی اولیه با توجه به وضعیت پراپ محدودیت
  useEffect(() => {
    let initialYear = SelectedYear;
    let initialMonth = SelectedMonth;
    let initialDay = SelectedDay;

    if (disablePastDates) {
      initialYear = Math.max(SelectedYear, todayJalaali.jy);
      if (initialYear === todayJalaali.jy) {
        initialMonth = Math.max(SelectedMonth, todayJalaali.jm);
      }
      if (initialYear === todayJalaali.jy && initialMonth === todayJalaali.jm) {
        initialDay = Math.max(SelectedDay, todayJalaali.jd);
      }
    }

    setSelectedDay(initialDay);
    setSelectedMonth(initialMonth);
    setSelectedYear(initialYear);
  }, [SelectedDay, SelectedMonth, SelectedYear, todayJalaali, disablePastDates]);

  const handleChangeDay = useCallback(
    (value: string | number) => {
      if (selectedDay !== Number(value)) {
        setSelectedDay(Number(value));
      }
    },
    [selectedDay]
  );

  const handleChangeMonth = useCallback(
    (value: string | number) => {
      if (selectedMonth !== Number(value)) {
        setSelectedMonth(Number(value));
      }
    },
    [selectedMonth]
  );

  const handleChangeYear = useCallback(
    (value: string | number) => {
      if (selectedYear !== Number(value)) {
        setSelectedYear(Number(value));
      }
    },
    [selectedYear]
  );

  return (
    <div className={className}>
      {/* 👇 انتخاب روز */}
      <Picker selectedValue={selectedDay} onValueChange={handleChangeDay}>
        {getDaysOfMonth(selectedMonth, selectedYear).map((day) => (
          <Picker.Item key={day.value} value={day.value}>
            {day.label}
          </Picker.Item>
        ))}
      </Picker>

      {/* 👇 انتخاب ماه */}
      <Picker selectedValue={selectedMonth} onValueChange={handleChangeMonth}>
        {months.map((month) => (
          <Picker.Item key={month.value} value={month.value}>
            {month.label}
          </Picker.Item>
        ))}
      </Picker>

      {/* 👇 انتخاب سال */}
      {!hideYear && (
        <Picker selectedValue={selectedYear} onValueChange={handleChangeYear}>
          {years.map((year) => (
            <Picker.Item key={year.value} value={year.value}>
              {year.label}
            </Picker.Item>
          ))}
        </Picker>
      )}
    </div>
  );
};

export const DatePickersMeta: CodeComponentMeta<DatePickersProps> = {
  name: 'DatePickers',
  importPath: '@/components/DatePickers',
  props: {
    onChange: {
      type: 'eventHandler',
      argTypes: [
        {
          name: 'selectedValues',
          type: 'object',
        },
      ],
      description: 'Callback function to handle changes in selected day, month, and year.',
    },
    SelectedDay: {
      type: 'number',
      defaultValue: 10,
    },
    SelectedMonth: {
      type: 'number',
      defaultValue: 10,
    },
    SelectedYear: {
      type: 'number',
      defaultValue: 1403,
    },
    selectedValues: {
      type: 'object',
      defaultValue: {},
    },
    customYears: {
      type: 'object',
      defaultValue: [],
      description: 'Custom years array to override the default generated years.',
    },
    hideYear: {
      type: 'boolean',
      defaultValue: false,
      description: 'اگر true باشد، انتخابگر سال نمایش داده نمی‌شود.',
    },
    disablePastDates: {
      type: 'boolean',
      defaultValue: false,
      description: 'اگر true باشد، تاریخ‌های قبل از امروز غیرقابل انتخاب می‌شوند.', // ✅ اضافه شد به تنظیمات Plasmic
    },
  },
  states: {
    value: {
      type: 'writable',
      variableType: 'object',
      valueProp: 'selectedValues',
      onChangeProp: 'onChange',
    },
  },
};
