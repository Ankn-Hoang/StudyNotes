// ===========================
//  utils.js – FIT4015 StudyNotes
//  Các hàm tiện ích dùng chung
// ===========================

// --- Format ngày giờ ---
function formatDate(dateStr) {
    if (!dateStr) return '–';
    var d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.getDate().toString().padStart(2,'0') + '/'
         + (d.getMonth()+1).toString().padStart(2,'0') + '/'
         + d.getFullYear();
  }
  
  // --- Truncate chuỗi ---
  function truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
  }
  
  // --- Validate URL ---
  function isValidUrl(str) {
    if (!str || str.trim() === '') return false;
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  }
  
  // --- Validate form fields, trả về { valid: bool, errors: {} } ---
  function validateDocForm(data) {
    var errors = {};
    var valid = true;
  
    if (!data.title || data.title.trim() === '') {
      errors.title = 'Tên tài liệu không được để trống';
      valid = false;
    }
    if (!data.subject || data.subject.trim() === '') {
      errors.subject = 'Môn học không được để trống';
      valid = false;
    }
    if (!data.year || data.year.trim() === '') {
      errors.year = 'Vui lòng chọn năm học';
      valid = false;
    }
    if (!isValidUrl(data.fileUrl)) {
      errors.fileUrl = 'Link download phải là URL hợp lệ (bắt đầu bằng https://)';
      valid = false;
    }
    if (!isValidUrl(data.imageUrl)) {
      errors.imageUrl = 'URL ảnh bìa phải là URL hợp lệ (bắt đầu bằng https://)';
      valid = false;
    }
  
    return { valid: valid, errors: errors };
  }
  
  // --- Hiển thị lỗi inline vào các field ---
  function showFormErrors(errors) {
    clearFormErrors();
    for (var field in errors) {
      var input = document.getElementById('f' + capitalize(field));
      var errDiv = document.getElementById('err' + capitalize(field));
      if (input) input.classList.add('is-invalid');
      if (errDiv) { errDiv.textContent = errors[field]; }
    }
  }
  
  // --- Xóa lỗi form ---
  function clearFormErrors() {
    var fields = ['Title', 'Subject', 'Year', 'FileUrl', 'ImageUrl'];
    fields.forEach(function(f) {
      var input = document.getElementById('f' + f);
      var errDiv = document.getElementById('err' + f);
      if (input) input.classList.remove('is-invalid');
      if (errDiv) errDiv.textContent = '';
    });
  }
  
  // --- Capitalize first letter ---
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // --- Badge HTML theo status ---
  function statusBadge(status) {
    if (status === 'Approved') return '<span class="badge-approved">✅ Approved</span>';
    return '<span class="badge-pending">⏳ Pending</span>';
  }
  
  // --- Toast thông báo (Bootstrap) ---
  function showToast(message, type) {
    var toast = document.getElementById('toastMsg');
    var body  = document.getElementById('toastBody');
    if (!toast || !body) return;
    body.textContent = message;
    toast.className = 'toast align-items-center border-0 ' + (type || '');
    var bsToast = new bootstrap.Toast(toast, { delay: 2800 });
    bsToast.show();
  }
  
  // --- Lấy unique values từ array theo key ---
  function uniqueValues(arr, key) {
    var seen = {};
    var result = [];
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i][key];
      if (v && !seen[v]) { seen[v] = true; result.push(v); }
    }
    return result.sort();
  }
  
  // --- Filter documents theo search + subject + year ---
  function filterDocuments(docs, search, subject, year) {
    var s = (search || '').toLowerCase().trim();
    return docs.filter(function(doc) {
      var matchSearch  = !s || (doc.title  || '').toLowerCase().includes(s)
                             || (doc.subject|| '').toLowerCase().includes(s);
      var matchSubject = !subject || doc.subject === subject;
      var matchYear    = !year    || doc.year    === year;
      return matchSearch && matchSubject && matchYear;
    });
  }
  