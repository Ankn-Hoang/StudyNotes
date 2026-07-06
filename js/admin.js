// ===========================
//  admin.js – FIT4015 StudyNotes
//  Logic trang quản trị (admin.html)
// ===========================

var adminDocs = [];
var editingId  = null;
var deleteId   = null;
var ITEMS_PER_PAGE = 8;
var currentPage    = 1;

// --- Khởi động ---
document.addEventListener('DOMContentLoaded', function() {
  adminLoadDocs();
  bindAdminEvents();
});

// ==============================
// LOAD & RENDER TABLE
// ==============================
function adminLoadDocs() {
  showAdminSkeleton(true);
  document.getElementById('adminTableWrap').style.display = 'none';
  document.getElementById('adminEmpty').style.display = 'none';
  document.getElementById('adminError').style.display = 'none';

  getAllDocuments()
    .then(function(docs) {
      adminDocs = docs;
      updateStats(docs);
      renderAdminTable(docs, currentPage);
      showAdminSkeleton(false);
    })
    .catch(function(err) {
      showAdminSkeleton(false);
      document.getElementById('adminError').style.display = 'block';
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
  var thumbHtml = isValidUrl(doc.imageUrl)
    ? '<img class="doc-thumb-admin" src="' + doc.imageUrl + '" alt="" onerror="this.src=\'\';">'
    : '<div class="doc-thumb-admin d-flex align-items-center justify-content-center bg-light">📄</div>';

  return '<td>' + num + '</td>'
    + '<td><div class="d-flex align-items-center gap-2">' + thumbHtml
    +   '<span style="font-weight:600;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
    +     (doc.title || '–') + '</span></div></td>'
    + '<td>' + (doc.subject || '–') + '</td>'
    + '<td>' + (doc.year || '–') + '</td>'
    + '<td><i class="bi bi-eye text-muted"></i> ' + (doc.views || 0) + '</td>'
    + '<td>' + statusBadge(doc.status) + '</td>'
    + '<td class="text-center">'
    +   '<div class="d-flex gap-1 justify-content-center">'
    +   (doc.status !== 'Approved'
      ? '<button class="btn-icon btn-icon-approve" onclick="approveDoc(\'' + doc.id + '\')" title="Duyệt"><i class="bi bi-check-lg"></i></button>'
      : '')
    +   '<button class="btn-icon btn-icon-edit" onclick="openEditDoc(\'' + doc.id + '\')" title="Sửa"><i class="bi bi-pencil"></i></button>'
    +   '<button class="btn-icon btn-icon-del"  onclick="openDeleteDoc(\'' + doc.id + '\',\'' + (doc.title||'').replace(/'/g,'') + '\')" title="Xóa"><i class="bi bi-trash3"></i></button>'
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
// FILTER (admin search + status)
// ==============================
function getAdminFiltered(docs) {
  var search = (document.getElementById('adminSearch').value || '').toLowerCase().trim();
  var status = document.getElementById('adminFilterStatus').value;
  return docs.filter(function(d) {
    var matchS = !search || (d.title || '').toLowerCase().includes(search);
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

  // Fill form
  document.getElementById('fTitle').value       = doc.title       || '';
  document.getElementById('fSubject').value     = doc.subject     || '';
  document.getElementById('fYear').value        = doc.year        || '';
  document.getElementById('fFileUrl').value     = doc.fileUrl     || '';
  document.getElementById('fImageUrl').value    = doc.imageUrl    || '';
  document.getElementById('fDescription').value = doc.description || '';
  document.getElementById('fStatus').value      = doc.status      || 'Pending';

  var m = new bootstrap.Modal(document.getElementById('formModal'));
  m.show();
}

function resetAdminForm() {
  ['fTitle','fSubject','fFileUrl','fImageUrl','fDescription'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('fYear').value   = '';
  document.getElementById('fStatus').value = 'Pending';
}

function getFormData() {
  return {
    title:       document.getElementById('fTitle').value.trim(),
    subject:     document.getElementById('fSubject').value.trim(),
    year:        document.getElementById('fYear').value,
    fileUrl:     document.getElementById('fFileUrl').value.trim(),
    imageUrl:    document.getElementById('fImageUrl').value.trim(),
    description: document.getElementById('fDescription').value.trim(),
    status:      document.getElementById('fStatus').value,
  };
}

function saveDoc() {
  var data = getFormData();
  var validation = validateDocForm(data);

  if (!validation.valid) {
    showFormErrors(validation.errors);
    return;
  }

  // Loading state
  document.getElementById('btnSave').disabled = true;
  document.getElementById('btnSaveSpinner').classList.remove('d-none');

  var promise = editingId
    ? updateDocument(editingId, data)
    : createDocument(Object.assign({ views: 0 }, data));

  promise
    .then(function(result) {
      // Update local cache
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
      document.getElementById('btnDeleteSpinner').classList.add('d-none');
    });
}

// ==============================
// BIND EVENTS
// ==============================
function bindAdminEvents() {
  // Vanilla JS
  document.getElementById('btnSave').addEventListener('click', saveDoc);
  document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
  document.getElementById('btnOpenAdd').addEventListener('click', openAddDoc);

  var btnOpenAddEmpty = document.getElementById('btnOpenAddEmpty');
  if (btnOpenAddEmpty) btnOpenAddEmpty.addEventListener('click', openAddDoc);

  // jQuery .on() events
  $('#adminSearch').on('input', function() {
    currentPage = 1;
    renderAdminTable(adminDocs, 1);
  });
  $('#adminFilterStatus').on('change', function() {
    currentPage = 1;
    renderAdminTable(adminDocs, 1);
  });

  // jQuery effects: slideDown/hide cho formModal
  $('#formModal').on('shown.bs.modal', function() {
    $('#formModal .modal-content').hide().slideDown(300);
  });
}

// ==============================
// SKELETON
// ==============================
function showAdminSkeleton(show) {
  document.getElementById('adminSkeleton').style.display = show ? 'block' : 'none';
}
