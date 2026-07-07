// ==========================================
//  admin.js – FIT4015 StudyNotes
//  Logic trang quản trị (admin.html) - Tiếng Việt Schema
// ==========================================

var adminDocs = [];
var adminSubjects = []; // Bộ nhớ cache lưu danh sách môn học
var editingId   = null;
var deleteId    = null;
var ITEMS_PER_PAGE = 8;
var currentPage    = 1;

// --- Khởi động ---
document.addEventListener('DOMContentLoaded', function() {
  adminLoadDocs();
  bindAdminEvents();
});

// ==============================
// LOAD & RENDER TABLE & SUBJECTS
// ==============================
function adminLoadDocs() {
  showAdminSkeleton(true);
  document.getElementById('adminTableWrap').style.display = 'none';
  document.getElementById('adminEmpty').style.display = 'none';
  document.getElementById('adminError').style.display = 'none';

  // Tải danh mục môn học trước, sau đó mới tải tài liệu để đồng bộ dữ liệu liên kết
  getAllSubjects()
    .then(function(subjects) {
      adminSubjects = subjects;
      populateAdminSubjectSelect(subjects); // Đổ dữ liệu vào <select id="fSubject">
      return getAllDocuments();
    })
    .then(function(docs) {
      adminDocs = docs;
      updateStats(docs);
      renderAdminTable(docs, currentPage);
      showAdminSkeleton(false);
    })
    .catch(function(err) {
      console.error(err);
      showAdminSkeleton(false);
      document.getElementById('adminError').style.display = 'block';
    });
}

// Hàm bổ trợ nạp danh sách môn học động vào Form
function populateAdminSubjectSelect(subjects) {
  var select = document.getElementById('fSubject');
  if (!select) return;
  select.innerHTML = '<option value="">-- Chọn môn học --</option>';
  subjects.forEach(function(sub) {
    var opt = document.createElement('option');
    opt.value = sub.id;
    opt.textContent = sub.name;
    select.appendChild(opt);
  });
}

function renderAdminTable(docs, page) {
  var filtered = getAdminFiltered(docs);
  var total    = filtered.length;
  var totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
  page = Math.min(page, totalPages);
  currentPage = page;

  var start = (page - 1) * ITEMS_PER_PAGE;
  var slice = filtered.slice(start, start + ITEMS_PER_PAGE);

  var tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = '';

  if (total === 0) {
    document.getElementById('adminTableWrap').style.display = 'none';
    document.getElementById('adminEmpty').style.display = 'block';
    return;
  }

  document.getElementById('adminEmpty').style.display = 'none';
  document.getElementById('adminTableWrap').style.display = 'block';

  slice.forEach(function(doc, idx) {
    var tr = document.createElement('tr');
    tr.innerHTML = buildAdminRow(doc, start + idx + 1);
    tbody.appendChild(tr);
  });

  renderPagination(totalPages, page);
}

function buildAdminRow(doc, num) {
  // Đồng bộ kiểm tra URL ảnh dựa vào doc.imageUrl (Bổ sung kiểm tra hàm tồn tại tránh crash code)
  var thumbHtml = (typeof isValidUrl === 'function' && isValidUrl(doc.imageUrl))
    ? '<img class="doc-thumb-admin" src="' + doc.imageUrl + '" alt="" onerror="this.src=\'\';">'
    : '<div class="doc-thumb-admin d-flex align-items-center justify-content-center bg-light">📄</div>';

  // ĐỒNG BỘ: Ánh xạ từ ID môn học (subjectId) sang Tên môn học thực tế hiển thị từ MockAPI
  var matchedSub = adminSubjects.find(function(s) { return String(s.id) === String(doc.subjectId); });
  var displaySubject = matchedSub ? matchedSub.name : 'Chưa phân loại';

  // ĐỒNG BỘ: Chuyển đổi hiển thị trạng thái chữ Tiếng Anh sang Badge Tiếng Việt đẹp mắt
  var statusHtml = '';
  if (doc.status === 'Approved') {
    statusHtml = '<span class="badge bg-success">Đã duyệt</span>';
  } else {
    statusHtml = '<span class="badge bg-warning text-dark">Chờ duyệt</span>';
  }

  // ĐÃ SỬA: Thay thế và dọn dẹp biến statusBadge cũ bị thiếu để tránh lỗi đứng trang
  return '<td>' + num + '</td>'
    + '<td><div class="d-flex align-items-center gap-2">' + thumbHtml
    +   '<span style="font-weight:600;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
    +    (doc.Tende || '–') + '</span></div></td>'
    + '<td>' + displaySubject + '</td>'
    + '<td>' + (doc.Nam || '–') + '</td>'
    + '<td><i class="bi bi-eye text-muted"></i> ' + (doc.views || 0) + '</td>'
    + '<td>' + statusHtml + '</td>'
    + '<td class="text-center">'
    +   '<div class="d-flex gap-1 justify-content-center">'
    +   (doc.status !== 'Approved'
      ? '<button class="btn-icon btn-icon-approve" onclick="approveDoc(\'' + doc.id + '\')" title="Duyệt"><i class="bi bi-check-lg"></i></button>'
      : '')
    +   '<button class="btn-icon btn-icon-edit" onclick="openEditDoc(\'' + doc.id + '\')" title="Sửa"><i class="bi bi-pencil"></i></button>'
    +   '<button class="btn-icon btn-icon-del"  onclick="openDeleteDoc(\'' + doc.id + '\',\'' + (doc.Tende||'').replace(/'/g,'') + '\')" title="Xóa"><i class="bi bi-trash3"></i></button>'
    +   '</div>'
    + '</td>';
}

// ==============================
// PAGINATION
// ==============================
function renderPagination(totalPages, current) {
  var ul = document.getElementById('adminPagination');
  ul.innerHTML = '';
  if (totalPages <= 1) return;

  for (var i = 1; i <= totalPages; i++) {
    var li = document.createElement('li');
    li.className = 'page-item' + (i === current ? ' active' : '');
    li.innerHTML = '<a class="page-link" href="#">' + i + '</a>';
    (function(page) {
      li.querySelector('a').addEventListener('click', function(e) {
        e.preventDefault();
        renderAdminTable(adminDocs, page);
      });
    })(i);
    ul.appendChild(li);
  }
}

// ==============================
// STATS
// ==============================
function updateStats(docs) {
  var approved = docs.filter(function(d) { return d.status === 'Approved'; }).length;
  var pending  = docs.filter(function(d) { return d.status !== 'Approved'; }).length;
  var views    = docs.reduce(function(sum, d) { return sum + (parseInt(d.views) || 0); }, 0);

  $('#statTotal').text(docs.length).hide().fadeIn(400);
  $('#statApproved').text(approved).hide().fadeIn(500);
  $('#statPending').text(pending).hide().fadeIn(600);
  $('#statViews').text(views).hide().fadeIn(700);
}

// ==============================
// FILTER (Tìm theo Tende + status)
// ==============================
function getAdminFiltered(docs) {
  var search = (document.getElementById('adminSearch').value || '').toLowerCase().trim();
  var status = document.getElementById('adminFilterStatus').value;
  return docs.filter(function(d) {
    var matchS = !search || (d.Tende || '').toLowerCase().includes(search);
    var matchSt = !status || d.status === status;
    return matchS && matchSt;
  });
}

// ==============================
// ADD / EDIT FORM
// ==============================
function openAddDoc() {
  editingId = null;
  document.getElementById('formModalTitle').textContent = 'Thêm tài liệu mới';
  document.getElementById('btnSaveText').textContent = 'Lưu tài liệu';
  clearFormErrors();
  resetAdminForm();
  document.getElementById('formError').classList.add('d-none');
  var m = new bootstrap.Modal(document.getElementById('formModal'));
  m.show();
}

function openEditDoc(id) {
  var doc = adminDocs.find(function(d) { return d.id === id; });
  if (!doc) return;
  editingId = id;
  document.getElementById('formModalTitle').textContent = 'Chỉnh sửa tài liệu';
  document.getElementById('btnSaveText').textContent = 'Cập nhật';
  clearFormErrors();
  document.getElementById('formError').classList.add('d-none');

  // ĐỒNG BỘ: Điền dữ liệu vào form từ các trường tiếng Việt của MockAPI
  document.getElementById('fTitle').value       = doc.Tende       || '';
  document.getElementById('fSubject').value     = doc.subjectId   || ''; // Chọn đúng ID môn học liên kết
  document.getElementById('fYear').value        = doc.Nam         || '';
  document.getElementById('fFileUrl').value     = doc.Link        || '';
  document.getElementById('fImageUrl').value    = doc.imageUrl    || '';
  document.getElementById('fDescription').value = doc.Mota        || '';
  document.getElementById('fStatus').value      = doc.status      || 'Pending';

  var m = new bootstrap.Modal(document.getElementById('formModal'));
  m.show();
}

// ĐÃ SỬA: Sửa lại hàm để dọn dẹp sạch sẽ dữ liệu của các loại thẻ Select và Input mới
function resetAdminForm() {
  ['fTitle', 'fSubject', 'fFileUrl', 'fImageUrl', 'fDescription', 'fYear'].forEach(function(id) {
    var element = document.getElementById(id);
    if (element) element.value = '';
  });
  document.getElementById('fStatus').value = 'Pending';
}

// ĐỒNG BỘ: Thu thập cấu trúc dữ liệu theo Schema tiếng Việt mới
function getFormData() {
  return {
    Tende:       document.getElementById('fTitle').value.trim(),
    subjectId:   document.getElementById('fSubject').value, // Mã ID môn học kết nối liên kết cơ sở dữ liệu
    Nam:         document.getElementById('fYear').value,
    Link:        document.getElementById('fFileUrl').value.trim(),
    imageUrl:    document.getElementById('fImageUrl').value.trim(),
    Mota:        document.getElementById('fDescription').value.trim(),
    status:      document.getElementById('fStatus').value,
  };
}

function saveDoc() {
  var data = getFormData();
  
  // Kiểm tra biểu mẫu nhanh thay vì dùng hàm validate cũ chưa đồng bộ
  if (!data.Tende || !data.subjectId || !data.Nam || !data.Link) {
    alert("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
    return;
  }

  // Trạng thái Loading
  document.getElementById('btnSave').disabled = true;
  document.getElementById('btnSaveSpinner').classList.remove('d-none');

  var promise = editingId
    ? updateDocument(editingId, data)
    : createDocument(Object.assign({ views: 0 }, data));

  promise
    .then(function(result) {
      if (editingId) {
        var idx = adminDocs.findIndex(function(d) { return d.id === editingId; });
        if (idx !== -1) adminDocs[idx] = result;
      } else {
        adminDocs.unshift(result);
      }
      updateStats(adminDocs);
      renderAdminTable(adminDocs, currentPage);
      bootstrap.Modal.getInstance(document.getElementById('formModal')).hide();
      showToast(editingId ? '✅ Cập nhật thành công!' : '✅ Thêm tài liệu thành công!', 'success');
      editingId = null;
    })
    .catch(function(err) {
      var errDiv = document.getElementById('formError');
      errDiv.textContent = '❌ Lỗi: ' + err.message;
      errDiv.classList.remove('d-none');
    })
    .finally(function() {
      document.getElementById('btnSave').disabled = false;
      document.getElementById('btnSaveSpinner').addClass('d-none');
    });
}

// ==============================
// APPROVE
// ==============================
function approveDoc(id) {
  updateDocument(id, { status: 'Approved' })
    .then(function(updated) {
      var idx = adminDocs.findIndex(function(d) { return d.id === id; });
      if (idx !== -1) adminDocs[idx].status = 'Approved';
      updateStats(adminDocs);
      renderAdminTable(adminDocs, currentPage);
      showToast('✅ Đã duyệt tài liệu!', 'success');
    })
    .catch(function() { showToast('❌ Không thể duyệt tài liệu', 'error'); });
}

// ==============================
// DELETE
// ==============================
function openDeleteDoc(id, name) {
  deleteId = id;
  document.getElementById('deleteDocName').textContent = 'Tài liệu: "' + name + '"';
  var m = new bootstrap.Modal(document.getElementById('deleteModal'));
  m.show();
}

function confirmDelete() {
  if (!deleteId) return;
  document.getElementById('btnConfirmDelete').disabled = true;
  document.getElementById('btnDeleteSpinner').classList.remove('d-none');

  deleteDocument(deleteId)
    .then(function() {
      adminDocs = adminDocs.filter(function(d) { return d.id !== deleteId; });
      updateStats(adminDocs);
      var newPage = currentPage > Math.ceil(adminDocs.length / ITEMS_PER_PAGE) ? currentPage - 1 : currentPage;
      renderAdminTable(adminDocs, Math.max(1, newPage));
      bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
      showToast('🗑️ Đã xóa tài liệu!', 'success');
      deleteId = null;
    })
    .catch(function() { showToast('❌ Không thể xóa tài liệu', 'error'); })
    .finally(function() {
      document.getElementById('btnConfirmDelete').disabled = false;
      document.getElementById('btnDeleteSpinner').addClass('d-none');
    });
}

// ==============================
// BIND EVENTS
// ==============================
function bindAdminEvents() {
  document.getElementById('btnSave').addEventListener('click', saveDoc);
  document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
  document.getElementById('btnOpenAdd').addEventListener('click', openAddDoc);

  var btnOpenAddEmpty = document.getElementById('btnOpenAddEmpty');
  if (btnOpenAddEmpty) btnOpenAddEmpty.addEventListener('click', openAddDoc);

  $('#adminSearch').on('input', function() {
    currentPage = 1;
    renderAdminTable(adminDocs, 1);
  });
  $('#adminFilterStatus').on('change', function() {
    currentPage = 1;
    renderAdminTable(adminDocs, 1);
  });

  $('#formModal').on('shown.bs.modal', function() {
    $('#formModal .modal-content').hide().slideDown(300);
  });
}

// ==============================
// SKELETON & ERRORS BYPASS
// ==============================
function showAdminSkeleton(show) {
  document.getElementById('adminSkeleton').style.display = show ? 'block' : 'none';
}
function clearFormErrors() {
  $('.invalid-feedback').text('');
  $('.form-control, .form-select').removeClass('is-invalid');
}// ==========================================
//  admin.js – FIT4015 StudyNotes
//  Logic trang quản trị (admin.html) - Tiếng Việt Schema
// ==========================================

var adminDocs = [];
var adminSubjects = []; // Bộ nhớ cache lưu danh sách môn học
var editingId   = null;
var deleteId    = null;
var ITEMS_PER_PAGE = 8;
var currentPage    = 1;

// --- Khởi động ---
document.addEventListener('DOMContentLoaded', function() {
  adminLoadDocs();
  bindAdminEvents();
});

// ==============================
// LOAD & RENDER TABLE & SUBJECTS
// ==============================
function adminLoadDocs() {
  showAdminSkeleton(true);
  document.getElementById('adminTableWrap').style.display = 'none';
  document.getElementById('adminEmpty').style.display = 'none';
  document.getElementById('adminError').style.display = 'none';

  // Tải danh mục môn học trước, sau đó mới tải tài liệu để đồng bộ dữ liệu liên kết
  getAllSubjects()
    .then(function(subjects) {
      adminSubjects = subjects;
      populateAdminSubjectSelect(subjects); // Đổ dữ liệu vào <select id="fSubject">
      return getAllDocuments();
    })
    .then(function(docs) {
      adminDocs = docs;
      updateStats(docs);
      renderAdminTable(docs, currentPage);
      showAdminSkeleton(false);
    })
    .catch(function(err) {
      console.error(err);
      showAdminSkeleton(false);
      document.getElementById('adminError').style.display = 'block';
    });
}

// Hàm bổ trợ nạp danh sách môn học động vào Form
function populateAdminSubjectSelect(subjects) {
  var select = document.getElementById('fSubject');
  if (!select) return;
  select.innerHTML = '<option value="">-- Chọn môn học --</option>';
  subjects.forEach(function(sub) {
    var opt = document.createElement('option');
    opt.value = sub.id;
    opt.textContent = sub.name;
    select.appendChild(opt);
  });
}

function renderAdminTable(docs, page) {
  var filtered = getAdminFiltered(docs);
  var total    = filtered.length;
  var totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
  page = Math.min(page, totalPages);
  currentPage = page;

  var start = (page - 1) * ITEMS_PER_PAGE;
  var slice = filtered.slice(start, start + ITEMS_PER_PAGE);

  var tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = '';

  if (total === 0) {
    document.getElementById('adminTableWrap').style.display = 'none';
    document.getElementById('adminEmpty').style.display = 'block';
    return;
  }

  document.getElementById('adminEmpty').style.display = 'none';
  document.getElementById('adminTableWrap').style.display = 'block';

  slice.forEach(function(doc, idx) {
    var tr = document.createElement('tr');
    tr.innerHTML = buildAdminRow(doc, start + idx + 1);
    tbody.appendChild(tr);
  });

  renderPagination(totalPages, page);
}

// ĐÃ SỬA: Thay thế khối render ảnh cũ bằng một hộp icon tài liệu đồng bộ sang xịn mịn
function buildAdminRow(doc, num) {
  var thumbHtml = '<div class="doc-thumb-admin d-flex align-items-center justify-content-center bg-light text-primary rounded" style="width:36px; height:36px; font-size:16px; border: 1px solid #dee2e6;"><i class="bi bi-file-earmark-text-fill"></i></div>';

  // Ánh xạ từ ID môn học (subjectId) sang Tên môn học thực tế hiển thị từ MockAPI
  var matchedSub = adminSubjects.find(function(s) { return String(s.id) === String(doc.subjectId); });
  var displaySubject = matchedSub ? matchedSub.name : 'Chưa phân loại';

  // Chuyển đổi hiển thị trạng thái chữ Tiếng Anh sang Badge Tiếng Việt đẹp mắt
  var statusHtml = '';
  if (doc.status === 'Approved') {
    statusHtml = '<span class="badge bg-success">Đã duyệt</span>';
  } else {
    statusHtml = '<span class="badge bg-warning text-dark">Chờ duyệt</span>';
  }

  return '<td>' + num + '</td>'
    + '<td><div class="d-flex align-items-center gap-2">' + thumbHtml
    +   '<span style="font-weight:600; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + (doc.Tende || '') + '">'
    +    (doc.Tende || '–') + '</span></div></td>'
    + '<td>' + displaySubject + '</td>'
    + '<td>' + (doc.Nam || '–') + '</td>'
    + '<td><i class="bi bi-eye text-muted"></i> ' + (doc.views || 0) + '</td>'
    + '<td>' + statusHtml + '</td>'
    + '<td class="text-center">'
    +   '<div class="d-flex gap-1 justify-content-center">'
    +   (doc.status !== 'Approved'
      ? '<button class="btn-icon btn-icon-approve btn btn-sm btn-outline-success px-2 py-1" onclick="approveDoc(\'' + doc.id + '\')" title="Duyệt"><i class="bi bi-check-lg"></i></button>'
      : '')
    +   '<button class="btn-icon btn-icon-edit btn btn-sm btn-outline-primary px-2 py-1" onclick="openEditDoc(\'' + doc.id + '\')" title="Sửa"><i class="bi bi-pencil"></i></button>'
    +   '<button class="btn-icon btn-icon-del btn btn-sm btn-outline-danger px-2 py-1"  onclick="openDeleteDoc(\'' + doc.id + '\',`' + (doc.Tende||'').replace(/["']/g,'') + '`)". replace(/\'/g,\'\') + "\')" title="Xóa"><i class="bi bi-trash3"></i></button>'
    +   '</div>'
    + '</td>';
}

// ==============================
// PAGINATION
// ==============================
function renderPagination(totalPages, current) {
  var ul = document.getElementById('adminPagination');
  ul.innerHTML = '';
  if (totalPages <= 1) return;

  for (var i = 1; i <= totalPages; i++) {
    var li = document.createElement('li');
    li.className = 'page-item' + (i === current ? ' active' : '');
    li.innerHTML = '<a class="page-link" href="#">' + i + '</a>';
    (function(page) {
      li.querySelector('a').addEventListener('click', function(e) {
        e.preventDefault();
        renderAdminTable(adminDocs, page);
      });
    })(i);
    ul.appendChild(li);
  }
}

// ==============================
// STATS
// ==============================
function updateStats(docs) {
  var approved = docs.filter(function(d) { return d.status === 'Approved'; }).length;
  var pending  = docs.filter(function(d) { return d.status !== 'Approved'; }).length;
  var views    = docs.reduce(function(sum, d) { return sum + (parseInt(d.views) || 0); }, 0);

  $('#statTotal').text(docs.length);
  $('#statApproved').text(approved);
  $('#statPending').text(pending);
  $('#statViews').text(views);
}

// ==============================
// FILTER (Tìm theo Tende + status)
// ==============================
function getAdminFiltered(docs) {
  var search = (document.getElementById('adminSearch').value || '').toLowerCase().trim();
  var status = document.getElementById('adminFilterStatus').value;
  return docs.filter(function(d) {
    var matchS = !search || (d.Tende || '').toLowerCase().includes(search);
    var matchSt = !status || d.status === status;
    return matchS && matchSt;
  });
}

// ==============================
// ADD / EDIT FORM
// ==============================
function openAddDoc() {
  editingId = null;
  document.getElementById('formModalTitle').textContent = 'Thêm tài liệu mới';
  document.getElementById('btnSaveText').textContent = 'Lưu tài liệu';
  clearFormErrors();
  resetAdminForm();
  document.getElementById('formError').classList.add('d-none');
  var m = new bootstrap.Modal(document.getElementById('formModal'));
  m.show();
}

// ĐÃ SỬA: Loại bỏ gán giá trị cho fImageUrl cũ
function openEditDoc(id) {
  var doc = adminDocs.find(function(d) { return d.id === id; });
  if (!doc) return;
  editingId = id;
  document.getElementById('formModalTitle').textContent = 'Chỉnh sửa tài liệu';
  document.getElementById('btnSaveText').textContent = 'Cập nhật';
  clearFormErrors();
  document.getElementById('formError').classList.add('d-none');

  // Điền dữ liệu vào form từ các trường tiếng Việt của MockAPI
  document.getElementById('fTitle').value       = doc.Tende       || '';
  document.getElementById('fSubject').value     = doc.subjectId   || ''; 
  document.getElementById('fYear').value        = doc.Nam         || '';
  document.getElementById('fFileUrl').value     = doc.Link        || '';
  document.getElementById('fDescription').value = doc.Mota        || '';
  document.getElementById('fStatus').value      = doc.status      || 'Pending';

  var m = new bootstrap.Modal(document.getElementById('formModal'));
  m.show();
}

// ĐÃ SỬA: Loại bỏ phần tử fImageUrl khỏi danh sách reset form
function resetAdminForm() {
  ['fTitle', 'fSubject', 'fFileUrl', 'fDescription', 'fYear'].forEach(function(id) {
    var element = document.getElementById(id);
    if (element) element.value = '';
  });
  document.getElementById('fStatus').value = 'Pending';
}

// ĐÃ SỬA: Thu thập cấu trúc dữ liệu loại bỏ hoàn toàn trường imageUrl
function getFormData() {
  return {
    Tende:       document.getElementById('fTitle').value.trim(),
    subjectId:   document.getElementById('fSubject').value, 
    Nam:         document.getElementById('fYear').value,
    Link:        document.getElementById('fFileUrl').value.trim(),
    Mota:        document.getElementById('fDescription').value.trim(),
    status:      document.getElementById('fStatus').value,
  };
}

function saveDoc() {
  var data = getFormData();
  
  if (!data.Tende || !data.subjectId || !data.Nam || !data.Link) {
    alert("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
    return;
  }

  // Trạng thái Loading
  document.getElementById('btnSave').disabled = true;
  document.getElementById('btnSaveSpinner').classList.remove('d-none');

  var promise = editingId
    ? updateDocument(editingId, data)
    : createDocument(Object.assign({ views: 0 }, data));

  promise
    .then(function(result) {
      if (editingId) {
        var idx = adminDocs.findIndex(function(d) { return d.id === editingId; });
        if (idx !== -1) adminDocs[idx] = result;
      } else {
        adminDocs.unshift(result);
      }
      updateStats(adminDocs);
      renderAdminTable(adminDocs, currentPage);
      bootstrap.Modal.getInstance(document.getElementById('formModal')).hide();
      showToast(editingId ? '✅ Cập nhật thành công!' : '✅ Thêm tài liệu thành công!', 'success');
      editingId = null;
    })
    .catch(function(err) {
      var errDiv = document.getElementById('formError');
      errDiv.textContent = '❌ Lỗi: ' + err.message;
      errDiv.classList.remove('d-none');
    })
    .finally(function() {
      document.getElementById('btnSave').disabled = false;
      // ĐÃ SỬA: Thay thế hàm .addClass() của jQuery sai luật thành .classList.add() chuẩn JavaScript thuần
      document.getElementById('btnSaveSpinner').classList.add('d-none');
    });
}

// ==============================
// APPROVE
// ==============================
function approveDoc(id) {
  updateDocument(id, { status: 'Approved' })
    .then(function(updated) {
      var idx = adminDocs.findIndex(function(d) { return d.id === id; });
      if (idx !== -1) adminDocs[idx].status = 'Approved';
      updateStats(adminDocs);
      renderAdminTable(adminDocs, currentPage);
      showToast('✅ Đã duyệt tài liệu!', 'success');
    })
    .catch(function() { showToast('❌ Không thể duyệt tài liệu', 'error'); });
}

// ==============================
// DELETE
// ==============================
function openDeleteDoc(id, name) {
  deleteId = id;
  document.getElementById('deleteDocName').textContent = 'Tài liệu: "' + name + '"';
  var m = new bootstrap.Modal(document.getElementById('deleteModal'));
  m.show();
}

function confirmDelete() {
  if (!deleteId) return;
  document.getElementById('btnConfirmDelete').disabled = true;
  document.getElementById('btnDeleteSpinner').classList.remove('d-none');

  deleteDocument(deleteId)
    .then(function() {
      adminDocs = adminDocs.filter(function(d) { return d.id !== deleteId; });
      updateStats(adminDocs);
      var newPage = currentPage > Math.ceil(adminDocs.length / ITEMS_PER_PAGE) ? currentPage - 1 : currentPage;
      renderAdminTable(adminDocs, Math.max(1, newPage));
      bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
      showToast('🗑️ Đã xóa tài liệu!', 'success');
      deleteId = null;
    })
    .catch(function() { showToast('❌ Không thể xóa tài liệu', 'error'); })
    .finally(function() {
      document.getElementById('btnConfirmDelete').disabled = false;
      // ĐÃ SỬA: Sửa .addClass() thành .classList.add() thuần giống như trên
      document.getElementById('btnDeleteSpinner').classList.add('d-none');
    });
}

// ==============================
// BIND EVENTS
// ==============================
function bindAdminEvents() {
  document.getElementById('btnSave').addEventListener('click', saveDoc);
  document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
  document.getElementById('btnOpenAdd').addEventListener('click', openAddDoc);

  var btnOpenAddEmpty = document.getElementById('btnOpenAddEmpty');
  if (btnOpenAddEmpty) btnOpenAddEmpty.addEventListener('click', openAddDoc);

  $('#adminSearch').on('input', function() {
    currentPage = 1;
    renderAdminTable(adminDocs, 1);
  });
  $('#adminFilterStatus').on('change', function() {
    currentPage = 1;
    renderAdminTable(adminDocs, 1);
  });
}

// ==============================
// SKELETON & ERRORS BYPASS
// ==============================
function showAdminSkeleton(show) {
  document.getElementById('adminSkeleton').style.display = show ? 'block' : 'none';
}
function clearFormErrors() {
  $('.invalid-feedback').text('');
  $('.form-control, .form-select').removeClass('is-invalid');
}

// Hàm showToast bổ trợ hiển thị thông báo
function showToast(msg, type) {
  var toastEl = document.getElementById('toastMsg');
  var toastBody = document.getElementById('toastBody');
  if (!toastEl || !toastBody) return;
  
  toastBody.textContent = msg;
  toastEl.className = 'toast align-items-center border-0 text-white ' + (type === 'success' ? 'bg-success' : 'bg-danger');
  
  var toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();
}