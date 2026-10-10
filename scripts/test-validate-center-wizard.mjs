import assert from "node:assert/strict";
import {
  flattenFieldErrors,
  getCenterInfoFieldErrors,
  getCreateStep1FieldErrors,
  getLocationFieldErrors,
  getOwnerFieldErrors,
  validateAddCenterAll,
  validateAddCenterTab
} from "../components/centerPanel/validateCenterWizard";
import { passwordStrengthScore } from "../components/formFieldRules";

function testOwnerRequiresContact() {
  const errors = getOwnerFieldErrors({
    managerLastName: "",
    phone: "",
    email: "",
    docs: {},
    requirePassword: false
  });
  assert.equal(errors.managerLastName, "نام خانوادگی مسئول را وارد کنید.");
  assert.ok(errors.phone);
  assert.ok(errors.establishment_notice);
}

function testOwnerPhoneFormat() {
  const errors = getOwnerFieldErrors({
    managerLastName: "رضایی",
    phone: "123",
    email: "",
    docs: {
      registered_center_name: "الف",
      license_number: "1",
      establishment_notice: "2",
      registration_docs: "3"
    },
    requirePassword: false
  });
  assert.equal(errors.phone, "شماره همراه معتبر نیست");
  assert.equal(Object.keys(errors).length, 1);
}

function testOwnerPasswordRequired() {
  const errors = getOwnerFieldErrors({
    managerLastName: "رضایی",
    phone: "09121234567",
    email: "a@b.com",
    docs: {
      registered_center_name: "الف",
      license_number: "1",
      establishment_notice: "2",
      registration_docs: "3"
    },
    password: "",
    repeatPassword: "",
    requirePassword: true
  });
  assert.equal(errors.password, "رمز عبور را وارد کنید.");
  assert.equal(errors.repeatPassword, "تکرار رمز عبور را وارد کنید.");
}

function testCreateStep1() {
  const errors = getCreateStep1FieldErrors({
    centerName: "",
    email: "bad",
    password: "weak",
    repeatPassword: "other",
    passwordStrengthScore
  });
  assert.ok(errors.centerName);
  assert.ok(errors.email);
  assert.ok(errors.password);
  assert.ok(errors.repeatPassword);
}

function testLocationPhone() {
  const errors = getLocationFieldErrors({
    address: "تهران",
    city: "تهران",
    state: "تهران",
    phone: "021"
  });
  assert.equal(errors.phone, "شماره تماس معتبر نیست");
}

function testCenterInfo() {
  const errors = getCenterInfoFieldErrors({
    title: "مرکز",
    description: "توضیح",
    careDomain: "",
    centerType: "روزانه",
    subcategory: "1"
  });
  assert.ok(errors.careDomain);
  assert.ok(errors.subcategory);
}

function testTabAndAll() {
  const state = {
    managerLastName: "رضایی",
    phone: "09121234567",
    email: "a@b.com",
    docs: {
      registered_center_name: "الف",
      license_number: "1",
      establishment_notice: "2",
      registration_docs: "3"
    },
    password: "Abcd1234!",
    repeatPassword: "Abcd1234!",
    title: "مرکز",
    description: "توضیح",
    careDomain: "سالمندان",
    centerType: "روزانه",
    subcategory: "12",
    address: "خیابان",
    city: "تهران",
    region: "تهران",
    call: "02112345678",
    images: [{ url: "x" }]
  };
  assert.deepEqual(validateAddCenterTab("1", state), []);
  assert.deepEqual(validateAddCenterAll(state), []);
  assert.ok(flattenFieldErrors({ a: "x", b: "x" }).length === 1);
}

testOwnerRequiresContact();
testOwnerPhoneFormat();
testOwnerPasswordRequired();
testCreateStep1();
testLocationPhone();
testCenterInfo();
testTabAndAll();
console.log("validateCenterWizard tests passed");
