document.addEventListener('DOMContentLoaded', () => {
  const quill = new Quill('#editorRoot', {
    theme: 'snow',
    placeholder: '开始撰写你的文章内容……',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean'],
      ],
    },
  });

  const titleInput = document.getElementById('articleTitle');
  const summaryInput = document.getElementById('articleSummary');
  const tagsInput = document.getElementById('articleTags');
  const shareUrlInput = document.getElementById('shareUrl');
  const previewTitle = document.getElementById('previewTitle');
  const previewSummary = document.getElementById('previewSummary');
  const previewTags = document.getElementById('previewTags');
  const previewBody = document.getElementById('previewBody');
  const previewMeta = document.getElementById('previewMeta');
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  const previewBtn = document.getElementById('previewBtn');

  const renderPreview = () => {
    const title = titleInput.value.trim() || '未命名文章';
    const summary = summaryInput.value.trim() || '这里会显示文章摘要。';
    const tags = tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    previewTitle.textContent = title;
    previewSummary.textContent = summary;
    previewTags.innerHTML = tags.length
      ? tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')
      : '<span class="tag">#untagged</span>';
    previewBody.innerHTML = quill.root.innerHTML || '<p>暂无正文内容。</p>';
    previewMeta.textContent = `更新于 ${new Date().toLocaleString()}`;
  };

  const escapeHtml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const sampleContent = () => {
    titleInput.value = 'Kakobuysheetfind 文章发布示例';
    summaryInput.value = '这是一个可编辑、可预览、可分享的文章发布页面示例。';
    tagsInput.value = '文章发布,富文本编辑,社交分享';
    quill.setContents([
      { insert: '欢迎使用 Kakobuysheetfind 文章发布中心\n' },
      { insert: '你可以在这里编辑富文本、插入链接、代码块、引用块和图片。\n\n' },
      { insert: '功能亮点\n', attributes: { bold: true } },
      { insert: '• 支持第三方插件扩展\n' },
      { insert: '• 支持预览文章展示效果\n' },
      { insert: '• 支持转发到 X、Reddit、Facebook\n' },
      { insert: '• 自动保留首页入口到 kakobuysheetfind.org\n' },
    ]);
    renderPreview();
  };

  const buildShareUrl = (network) => {
    const url = encodeURIComponent(shareUrlInput.value.trim() || location.href);
    const title = encodeURIComponent(titleInput.value.trim() || document.title);
    const text = encodeURIComponent(summaryInput.value.trim() || '查看这篇文章。');

    switch (network) {
      case 'x':
        return `https://twitter.com/intent/tweet?url=${url}&text=${text}%20%23Kakobuysheetfind`;
      case 'reddit':
        return `https://www.reddit.com/submit?url=${url}&title=${title}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      default:
        return '#';
    }
  };

  document.querySelectorAll('[data-plugin]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.plugin;
      if (type === 'code') {
        quill.insertText(quill.getSelection(true)?.index ?? quill.getLength(), '\nconsole.log("Hello from plugin");\n', { 'code-block': true });
      } else if (type === 'quote') {
        quill.insertText(quill.getSelection(true)?.index ?? quill.getLength(), '\n“这里是引用内容。”\n', { blockquote: true });
      } else if (type === 'image') {
        quill.insertEmbed(quill.getSelection(true)?.index ?? quill.getLength(), 'image', 'https://placehold.co/1200x700/png?text=Image+Placeholder');
      } else if (type === 'divider') {
        quill.insertText(quill.getSelection(true)?.index ?? quill.getLength(), '\n\n');
        quill.insertEmbed(quill.getSelection(true)?.index ?? quill.getLength(), 'divider', true);
      }
      renderPreview();
    });
  });

  titleInput.addEventListener('input', renderPreview);
  summaryInput.addEventListener('input', renderPreview);
  tagsInput.addEventListener('input', renderPreview);
  quill.on('text-change', renderPreview);

  previewBtn.addEventListener('click', renderPreview);
  loadSampleBtn.addEventListener('click', sampleContent);

  document.getElementById('shareX').addEventListener('click', () => window.open(buildShareUrl('x'), '_blank', 'noopener,noreferrer'));
  document.getElementById('shareReddit').addEventListener('click', () => window.open(buildShareUrl('reddit'), '_blank', 'noopener,noreferrer'));
  document.getElementById('shareFacebook').addEventListener('click', () => window.open(buildShareUrl('facebook'), '_blank', 'noopener,noreferrer'));

  sampleContent();
});
