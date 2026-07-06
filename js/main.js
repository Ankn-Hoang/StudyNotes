// ===========================
//  main.js – FIT4015 StudyNotes
//  Logic trang khách hàng (index.html)
// ===========================

var allDocs = [];        // cache toàn bộ data từ API
var favorites = JSON.parse(localStorage.getItem('sn_favs') || '[]');
var isGridView = true;

// --- Khởi động ---
document.addEventListener('DOMContentLoaded', function() {
  loadDocuments();
  bindSearchEvents();
  bindViewToggle();
});

// ==============================
// LOAD & RENDER
// ==============================
function loadDocuments() {
  showSkeleton(true);
  hideError();

  getAllDocuments()
    .then(function(docs) {
      allDocs = docs;
      populateFilterSubject(docs);
      renderDocs(docs);
      showSkeleton(false);
    })
    .catch(function(err) {
      showSkeleton(false);
      showError('Không thể kết nối API: ' + err.message);
    });
}

// Render danh sách card
function renderDocs(docs) {
  var grid = document.getElementById('docGrid');
  var empty = document.getElementById('emptyState');
  var count = document.getElementById('resultCount');

  grid.innerHTML = '';

  if (docs.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    count.textContent = 'Không có kết quả';
    return;
  }

  empty.style.display = 'none';
  grid.style.display = 'flex';
  grid.className = isGridView ? 'row g-4' : 'row g-3 list-view';
  count.textContent = 'Hiển thị ' + docs.length + ' tài liệu';

  // Chỉ render Approved ở trang public
  var visible = docs.filter(function(d) { return d.status === 'Approved'; });
  if (visible.length === 0) {
    empty.style.display = 'block';
    count.textContent = 'Chưa có tài liệu được duyệt';
    return;
  }

  visible.forEach(function(doc, idx) {
    var col = document.createElement('div');
    col.className = isGridView ? 'col-sm-6 col-md-4 col-lg-4' : 'col-12';
    col.style.animationDelay = (idx * 0.06) + 's';
    col.innerHTML = buildDocCard(doc);
    grid.appendChild(col);
  });

  count.textContent = 'Hiển thị ' + visible.length + ' tài liệu';
}

// Tạo HTML cho mỗi card
function buildDocCard(doc) {
  var isFav = favorites.indexOf(doc.id) !== -1;
  var imgHtml = isValidUrl(doc.imageUrl)
    ? '<img class="doc-card-img" src="' + doc.imageUrl + '" alt="' + doc.title + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
      + '<div class="doc-card-img-placeholder" style="display:none;">📄</div>'
    : '<div class="doc-card-img-placeholder">📄</div>';

  return '<div class="doc-card">'
    + imgHtml
    + '<div class="doc-card-body">'
    +   '<div class="doc-card-subject">' + (doc.subject || 'Chưa phân loại') + '</div>'
    +   '<div class="doc-card-title">' + (doc.title || 'Không có tiêu đề') + '</div>'
    +   '<div class="doc-card-desc">' + (doc.description || 'Chưa có mô tả.') + '</div>'
    +   '<div class="doc-card-meta">'
    +     '<span><i class="bi bi-calendar3"></i> ' + (doc.year || '–') + '</span>'
    +     '<span><i class="bi bi-eye"></i> ' + (doc.views || 0) + ' lượt xem</span>'
    +     '<button class="btn-fav ' + (isFav ? 'active' : '') + '" data-id="' + doc.id + '" title="Yêu thích">'
    +       '<i class="bi ' + (isFav ? 'bi-heart-fill' : 'bi-heart') + '"></i>'
    +     '</button>'
    +   '</div>'
    +   '<div class="doc-card-footer">'
    +     '<button class="btn-detail" onclick="openDetail(\'' + doc.id + '\')"><i class="bi bi-eye"></i> Xem chi tiết</button>'
    +     '<a class="btn-download" href="' + (doc.fileUrl || '#') + '" target="_blank"><i class="bi bi-download"></i> Tải xuống</a>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

// ==============================
// DETAIL MODAL
// ==============================
function openDetail(id) {
  var doc = allDocs.find(function(d) { return d.id === id; });
  if (!doc) return;

  var body = document.getElementById('modalBody');
  var imgHtml = isValidUrl(doc.imageUrl)
    ? '<img class="modal-detail-img" src="' + doc.imageUrl + '" alt="' + doc.title + '">'
    : '';

  body.innerHTML = imgHtml
    + '<div class="modal-subject-tag">' + (doc.subject || 'Chưa phân loại') + '</div>'
    + '<h4 class="modal-doc-title">' + (doc.title || '–') + '</h4>'
    + '<div class="modal-meta">'
    +   '<i class="bi bi-calendar3"></i> Năm học: <strong>' + (doc.year || '–') + '</strong>'
    +   ' &nbsp;·&nbsp; <i class="bi bi-eye"></i> ' + ((doc.views || 0) + 1) + ' lượt xem'
    + '</div>'
    + '<p class="modal-desc">' + (doc.description || 'Chưa có mô tả cho tài liệu này.') + '</p>'
    + '<a class="btn-modal-dl" href="' + (doc.fileUrl || '#') + '" target="_blank">'
    +   '<i class="bi bi-download"></i> Tải tài liệu xuống'
    + '</a>';

  var modal = new bootstrap.Modal(document.getElementById('detailModal'));
  modal.show();

  // Tăng lượt xem bằng PUT API
  incrementView(doc).then(function(updated) {
    doc.views = updated.views;
  }).catch(function() {});
}

// ==============================
// SEARCH & FILTER
// ==============================
function bindSearchEvents() {
  // Vanilla JS events
  document.getElementById('btnSearch').addEventListener('click', applyFilters);
  document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') applyFilters();
  });
  document.getElementById('filterSubject').addEventListener('change', applyFilters);
  document.getElementById('filterYear').addEventListener('change', applyFilters);
  document.getElementById('btnReset').addEventListener('click', resetFilters);

  // jQuery events (đáp ứng yêu cầu jQuery .on())
  $('#searchInput').on('input', function() {
    if ($(this).val().trim() === '') applyFilters();
  });

  // jQuery fadeIn cho kết quả khi filter
  $(document).on('click', '.btn-fav', handleFavClick);
}

function applyFilters() {
  var search  = document.getElementById('searchInput').value;
  var subject = document.getElementById('filterSubject').value;
  var year    = document.getElementById('filterYear').value;

  var filtered = filterDocuments(allDocs, search, subject, year);

  // jQuery fadeOut -> render -> fadeIn
  $('#docGrid').fadeOut(120, function() {
    renderDocs(filtered);
    $('#docGrid').fadeIn(200);
  });
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterSubject').value = '';
  document.getElementById('filterYear').value = '';
  renderDocs(allDocs);
}

function populateFilterSubject(docs) {
  var subjects = uniqueValues(docs, 'subject');
  var sel = document.getElementById('filterSubject');
  subjects.forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
}

// ==============================
// FAVOURITES (jQuery DOM)
// ==============================
function handleFavClick(e) {
  e.stopPropagation();
  var btn = $(this);
  var id = btn.data('id');
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

// ==============================
// VIEW TOGGLE
// ==============================
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

// ==============================
// SKELETON / ERROR HELPERS
// ==============================
function showSkeleton(show) {
  var sk = document.getElementById('skeletonWrap');
  var grid = document.getElementById('docGrid');
  if (show) {
    sk.style.display = 'flex';
    grid.style.display = 'none';
  } else {
    sk.style.display = 'none';
  }
}

function showError(msg) {
  document.getElementById('errorState').style.display = 'block';
  document.getElementById('errorMsg').textContent = msg || 'Đã xảy ra lỗi.';
}

function hideError() {
  document.getElementById('errorState').style.display = 'none';
}
