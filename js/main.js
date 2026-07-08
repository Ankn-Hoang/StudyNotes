
var allDocs = [];        // Cache dữ liệu tài liệu hiện tại
var favorites = JSON.parse(localStorage.getItem('sn_favs') || '[]');
var isGridView = true;

var currentFilters = {
  search: "",
  subjectId: "",
  schoolYear: ""
};

document.addEventListener('DOMContentLoaded', function() {
  initApp();
  bindSearchEvents();
  bindViewToggle();
});

function initApp() {
  showSkeleton(true);
  hideError();

  getAllSubjects()
    .then(function(subjects) {
      populateFilterSubject(subjects);
      loadDocuments();
    })
    .catch(function(err) {
      showSkeleton(false);
      showError('Không thể tải danh mục môn học: ' + err.message);
    });
}

function populateFilterSubject(subjects) {
  var sel = document.getElementById('filterSubject');
  sel.innerHTML = '<option value="">-- Tất cả môn học --</option>';
  
  subjects.forEach(function(sub) {
    var opt = document.createElement('option');
    opt.value = sub.id; (Ví dụ: "1", "2")
    opt.textContent = sub.name;
    sel.appendChild(opt);
  });
}

function loadDocuments() {
  showSkeleton(true);
  hideError();

  getAllDocuments(currentFilters.search, currentFilters.subjectId, currentFilters.schoolYear)
    .then(function(docs) {
      allDocs = docs;
      renderDocs(docs);
      showSkeleton(false);
    })
    .catch(function(err) {
      showSkeleton(false);
      showError('Không thể kết nối API: ' + err.message);
    });
}

function renderDocs(docs) {
  var grid = document.getElementById('docGrid');
  var empty = document.getElementById('emptyState');
  var count = document.getElementById('resultCount');

  grid.innerHTML = '';

  var visible = docs.filter(function(d) { return d.status === 'Approved' || !d.status; });

  if (visible.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    count.textContent = 'Không tìm thấy tài liệu phù hợp';
    return;
  }

  empty.style.display = 'none';
  grid.style.display = 'flex';
  grid.className = isGridView ? 'row g-4' : 'row g-3 list-view';
  count.textContent = 'Hiển thị ' + visible.length + ' tài liệu';

  visible.forEach(function(doc, idx) {
    var col = document.createElement('div');
    col.className = isGridView ? 'col-sm-6 col-md-4 col-lg-4' : 'col-12';
    col.style.animationDelay = (idx * 0.06) + 's';
    col.innerHTML = buildDocCard(doc);
    grid.appendChild(col);
  });
}

function buildDocCard(doc) {
  var isFav = favorites.indexOf(doc.id) !== -1;

  var title = doc.Tende || 'Không có tiêu đề';
  var description = doc.Mota || 'Chưa có mô tả ngắn.';
  var year = doc.Nam || '–';
  var fileLink = doc.Link || '#';

  var shortText = title.substring(0, 2).toUpperCase();

  var documentThumbnailHtml = '<div class="user-doc-thumbnail-wrap">'
    + '  <div class="user-doc-blur-bg">' + shortText + '</div>'
    + '  <div class="user-doc-preview-card">'
    + '     <i class="bi bi-file-earmark-pdf-fill text-danger fs-1"></i>'
    + '     <small class="text-muted d-block mt-1" style="font-size:10px; font-weight:600; letter-spacing:1px;">STUDY NOTES</small>'
    + '  </div>'
    + '</div>';

  return '<div class="doc-card h-100 shadow-sm border-1 rounded-3 overflow-hidden bg-white">'
    + documentThumbnailHtml
    + '<div class="doc-card-body p-3">'
    +   '<div class="doc-card-title fw-bold text-dark text-truncate" style="font-size:16px;" title="' + title + '">' + title + '</div>'
    +   '<div class="doc-card-desc text-muted mt-1 text-clamp-2" style="font-size:13px; min-height:38px;">' + description + '</div>'
    +   '<div class="doc-card-meta d-flex justify-content-between align-items-center mt-3 text-secondary" style="font-size:12px;">'
    +     '<span><i class="bi bi-calendar3"></i> Năm học: ' + year + '</span>'
    +     '<span><i class="bi bi-eye"></i> ' + (doc.views || 0) + ' lượt xem</span>'
    +     '<button class="btn-fav ' + (isFav ? 'active' : '') + '" data-id="' + doc.id + '" title="Yêu thích" style="border:none; background:transparent;">'
    +       '<i class="bi ' + (isFav ? 'bi-heart-fill text-danger' : 'bi-heart') + '"></i>'
    +     '</button>'
    +   '</div>'
    +   '<div class="doc-card-footer d-flex gap-2 mt-3">'
    +     '<button class="btn btn-sm btn-outline-primary w-50" onclick="openDetail(\'' + doc.id + '\')"><i class="bi bi-eye"></i> Xem chi tiết</button>'
    +     '<a class="btn btn-sm btn-primary w-50 d-flex align-items-center justify-content-center" href="' + fileLink + '" target="_blank"><i class="bi bi-download me-1"></i> Tải xuống</a>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

function openDetail(id) {
  var doc = allDocs.find(function(d) { return d.id === id; });
  if (!doc) return;

  var body = document.getElementById('modalBody');
  
  var title = doc.Tende || 'Không có tiêu đề';
  var description = doc.Mota || 'Chưa có mô tả cho tài liệu này.';
  var year = doc.Nam || '–';
  var fileLink = doc.Link || '#';
  var temporaryViews = (parseInt(doc.views) || 0) + 1;
  var shortText = title.substring(0, 2).toUpperCase();

  var modalPreviewHtml = '<div class="user-doc-thumbnail-wrap rounded-3 mb-3" style="height: 180px; background: #f1f3f5;">'
    + '  <div class="user-doc-blur-bg" style="font-size: 120px;">' + shortText + '</div>'
    + '  <div class="user-doc-preview-card" style="padding: 20px 40px;">'
    + '     <i class="bi bi-file-earmark-text-fill text-primary" style="font-size: 3.5rem;"></i>'
    + '     <span class="d-block mt-2 badge bg-secondary text-uppercase" style="font-size: 11px;">Tài liệu học tập</span>'
    + '  </div>'
    + '</div>';

  body.innerHTML = modalPreviewHtml
    + '<h4 class="modal-doc-title fw-bold text-dark mt-2">' + title + '</h4>'
    + '<div class="modal-meta my-2 text-secondary" style="font-size:14px;">'
    +   '<i class="bi bi-calendar3"></i> Năm học: <strong>' + year + '</strong>'
    +   ' &nbsp;·&nbsp; <i class="bi bi-eye-fill text-info"></i> Lượt xem: <span id="modalViewCount">' + temporaryViews + '</span>'
    + '</div>'
    + '<hr class="text-muted opacity-25" />'
    + '<h6 class="fw-bold text-secondary mb-1" style="font-size:13px;">MÔ TẢ CHI TIẾT:</h6>'
    + '<p class="modal-desc text-dark lh-base" style="font-size:15px; text-align:justify;">' + description + '</p>'
    + '<div class="mt-4 text-end">'
    +   '<button class="btn btn-light me-2" data-bs-dismiss="modal">Đóng lại</button>'
    +   '<a class="btn btn-primary btn-modal-dl px-4" href="' + fileLink + '" target="_blank">'
    +     '<i class="bi bi-download"></i> Xem file / Tải tài liệu gốc'
    +   '</a>'
    + '</div>';

  var modal = new bootstrap.Modal(document.getElementById('detailModal'));
  modal.show();

  if (typeof incrementView === 'function') {
    incrementView(doc)
      .then(function(updatedDoc) {
        doc.views = updatedDoc.views;
      })
      .catch(function(err) {
        console.error("Không thể cập nhật lượt xem lên máy chủ:", err);
      });
  }
}

function bindSearchEvents() {
  document.getElementById('btnSearch').addEventListener('click', applyFilters);
  
  document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') applyFilters();
  });
  
  document.getElementById('filterSubject').addEventListener('change', applyFilters);
  document.getElementById('filterYear').addEventListener('change', applyFilters);
  document.getElementById('btnReset').addEventListener('click', resetFilters);

  $('#searchInput').on('input', function() {
    if ($(this).val().trim() === '') {
      applyFilters();
    }
  });

  $(document).on('click', '.btn-fav', handleFavClick);
}

function applyFilters() {
  currentFilters.search = document.getElementById('searchInput').value.trim();
  currentFilters.subjectId = document.getElementById('filterSubject').value;
  currentFilters.schoolYear = document.getElementById('filterYear').value;

  $('#docGrid').fadeOut(120, function() {
    loadDocuments(); 
    $('#docGrid').fadeIn(200);
  });
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterSubject').value = '';
  document.getElementById('filterYear').value = '';
  
  currentFilters = { search: "", subjectId: "", schoolYear: "" };
  
  $('#docGrid').fadeOut(120, function() {
    loadDocuments();
    $('#docGrid').fadeIn(200);
  });
}

function handleFavClick(e) {
  e.stopPropagation();
  var btn = $(this);
  var id = String(btn.data('id'));
  var idx = favorites.indexOf(id);

  if (idx === -1) {
    favorites.push(id);
    btn.addClass('active').find('i').removeClass('bi-heart').addClass('bi-heart-fill');
    btn.css('transform', 'scale(1.4)');
    setTimeout(function() { btn.css('transform', ''); }, 200);
  } else {
    favorites.splice(idx, 1);
    btn.removeClass('active').find('i').removeClass('bi-heart-fill').addClass('bi-heart');
  }
  localStorage.setItem('sn_favs', JSON.stringify(favorites));
}

function bindViewToggle() {
  document.getElementById('btnGrid').addEventListener('click', function() {
    isGridView = true;
    this.classList.add('active');
    document.getElementById('btnList').classList.remove('active');
    applyFilters();
  });
  document.getElementById('btnList').addEventListener('click', function() {
    isGridView = false;
    this.classList.add('active');
    document.getElementById('btnGrid').classList.remove('active');
    applyFilters();
  });
}

function showSkeleton(show) {
  var sk = document.getElementById('skeletonWrap');
  var grid = document.getElementById('docGrid');
  if (show) {
    if(sk) sk.style.display = 'flex';
    if(grid) grid.style.display = 'none';
  } else {
    if(sk) sk.style.display = 'none';
  }
}

function showError(msg) {
  var errState = document.getElementById('errorState');
  var errMsg = document.getElementById('errorMsg');
  if(errState) errState.style.display = 'block';
  if(errMsg) errMsg.textContent = msg || 'Đã xảy ra lỗi hệ thống.';
}

function hideError() {
  var errState = document.getElementById('errorState');
  if(errState) errState.style.display = 'none';
}