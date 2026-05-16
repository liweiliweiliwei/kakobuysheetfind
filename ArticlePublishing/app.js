document.addEventListener('DOMContentLoaded', () => {
  const quill = new Quill('#editorRoot', {
    theme: 'snow',
    placeholder: '请输入文章内容',
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
  const coverImageInput = document.getElementById('coverImageUrl');
  const docxFileInput = document.getElementById('docxFile');
  const fillFromDocxBtn = document.getElementById('fillFromDocx');
  const previewTitle = document.getElementById('previewTitle');
  const previewSummary = document.getElementById('previewSummary');
  const previewTags = document.getElementById('previewTags');
  const previewBody = document.getElementById('previewBody');
  const previewMeta = document.getElementById('previewMeta');
  const shareCardPlatform = document.getElementById('shareCardPlatform');
  const shareCardTitle = document.getElementById('shareCardTitle');
  const shareCardSummary = document.getElementById('shareCardSummary');
  const shareCardUrl = document.getElementById('shareCardUrl');
  const shareCardDomain = document.getElementById('shareCardDomain');
  const shareCardType = document.getElementById('shareCardType');
  const shareCardThumb = document.getElementById('shareCardThumb');
  const shareCardImage = document.getElementById('shareCardImage');
  const shareCard = document.getElementById('shareCard');
  const shareCardTabs = document.querySelectorAll('[data-share-mode]');
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  const previewBtn = document.getElementById('previewBtn');

  const escapeHtml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const getShareMeta = () => {
    const title = titleInput.value.trim() || '请输入标题';
    const summary = summaryInput.value.trim() || '请输入摘要';
    const shareUrl = shareUrlInput.value.trim() || 'https://kakobuysheetfind.org/ArticlePublishing/';
    const coverImage = coverImageInput.value.trim();
    let domain = 'kakobuysheetfind.org';
    const ogImage = coverImage || 'https://si.geilicdn.com/pcitem902002701844-5ee10000019c9c9854d50a23111a_1500_2000.jpg?w=640&h=640';

    try {
      domain = new URL(shareUrl).hostname.replace(/^www\./, '');
    } catch {
      domain = 'kakobuysheetfind.org';
    }

    return { title, summary, shareUrl, domain, ogImage };
  };

  let shareMode = 'x';

  const renderPreview = () => {
    const title = titleInput.value.trim();
    const summary = summaryInput.value.trim();
    const tags = tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const shareMeta = getShareMeta();

    previewTitle.textContent = title || '请输入标题';
    previewSummary.textContent = summary || '请输入摘要';
    previewTags.innerHTML = tags.length
      ? tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')
      : '<span class="tag">#标签</span>';
    previewBody.innerHTML = quill.root.innerHTML || '<p class="preview-placeholder">请输入正文内容</p>';
    previewMeta.textContent = `更新于 ${new Date().toLocaleString()}`;

    const modeLabels = {
      x: 'X 预览',
      facebook: 'Facebook 预览',
      reddit: 'Reddit 预览',
    };

    const cardLabels = {
      x: 'X',
      facebook: 'FB',
      reddit: 'R',
    };

    const cardToneClasses = ['share-card--x', 'share-card--facebook', 'share-card--reddit'];

    shareCardPlatform.textContent = `${modeLabels[shareMode]} · 实时卡片`;
    shareCardTitle.textContent = shareMeta.title;
    shareCardSummary.textContent = shareMeta.summary;
    shareCardUrl.textContent = shareMeta.shareUrl;
    shareCardDomain.textContent = shareMeta.domain;
    shareCardType.textContent = `${modeLabels[shareMode]} · ${tags.length} tags`;
    shareCardThumb.dataset.label = cardLabels[shareMode];
    shareCardImage.src = shareMeta.ogImage;
    shareCardImage.alt = `${shareMeta.title} 封面图`;
    shareCardImage.style.display = shareMeta.ogImage ? 'block' : 'none';
    shareCardThumb.classList.toggle('share-card-cover', Boolean(shareMeta.ogImage));
    shareCard.classList.remove(...cardToneClasses);
    shareCard.classList.add(`share-card--${shareMode}`);
  };

  const sampleContent = () => {
    titleInput.value = '';
    summaryInput.value = '';
    tagsInput.value = '';
    coverImageInput.value = '';
    docxFileInput.value = '';
    quill.setText('');
    renderPreview();
  };

  const buildShareUrl = (network) => {
    const url = encodeURIComponent(shareUrlInput.value.trim() || 'https://kakobuysheetfind.org/ArticlePublishing/');
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

  const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();

  const inferSummary = (paragraphs) => {
    const candidates = paragraphs.filter((line) => line.length > 18);
    return candidates[0] || paragraphs[0] || '';
  };

  const inferTags = (text) => {
    const keywords = Array.from(new Set((text.match(/[\p{Script=Han}\w-]{2,}/gu) || [])
      .map((word) => word.toLowerCase())
      .filter((word) => !/^(the|and|for|with|from|into|this|that|document|title|summary|tags|tag|content|body)$/i.test(word))));
    return keywords.slice(0, 6);
  };

  const pickFirstMatch = (lines, patterns) => {
    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) return normalizeText(match[1] || match[2] || '');
      }
    }
    return '';
  };

  const parseStructuredDocxText = (rawText, fileName) => {
    const lines = rawText
      .split(/\r?\n/)
      .map((line) => normalizeText(line))
      .filter(Boolean);

    const title = pickFirstMatch(lines, [
      /^标题[:：\s]+(.+)$/i,
      /^title[:：\s]+(.+)$/i,
      /^文章标题[:：\s]+(.+)$/i,
    ]) || lines[0] || fileName.replace(/\.docx$/i, '');

    const summary = pickFirstMatch(lines, [
      /^摘要[:：\s]+(.+)$/i,
      /^摘要说明[:：\s]+(.+)$/i,
      /^summary[:：\s]+(.+)$/i,
    ]) || inferSummary(lines.slice(1, 5));

    const tagsLine = pickFirstMatch(lines, [
      /^标签[:：\s]+(.+)$/i,
      /^tags?[:：\s]+(.+)$/i,
      /^关键词[:：\s]+(.+)$/i,
    ]);

    const bodyStartIndex = lines.findIndex((line) => /^(正文|内容|body)[:：\s]*$/i.test(line));
    const body = bodyStartIndex >= 0 ? lines.slice(bodyStartIndex + 1).join('\n\n') : lines.slice(1).join('\n\n');
    const inferredTags = inferTags(tagsLine || [title, summary, body].join(' '));

    return {
      title,
      summary,
      tags: inferredTags,
      body: body || lines.join('\n\n'),
    };
  };

  const parseDocxFile = async (file) => {
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = window.mammoth;
    if (!mammoth?.extractRawText) {
      throw new Error('Mammoth browser bundle failed to load');
    }
    const result = await mammoth.extractRawText({ arrayBuffer });
    const parsed = parseStructuredDocxText(result.value, file.name);

    titleInput.value = parsed.title;
    summaryInput.value = parsed.summary;
    tagsInput.value = parsed.tags.join(', ');
    quill.setText(parsed.body || '');
    renderPreview();
  };

  shareCardTabs.forEach((button) => {
    button.addEventListener('click', () => {
      shareMode = button.dataset.shareMode || 'x';
      shareCardTabs.forEach((tab) => tab.classList.toggle('active', tab === button));
      renderPreview();
    });
  });

  document.querySelectorAll('[data-plugin]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.plugin;
      const index = quill.getSelection(true)?.index ?? quill.getLength();

      if (type === 'code') {
        quill.insertText(index, '\nconsole.log("Hello from plugin");\n', { 'code-block': true });
      } else if (type === 'quote') {
        quill.insertText(index, '\n“这里是引用内容。”\n', { blockquote: true });
      } else if (type === 'image') {
        quill.insertEmbed(index, 'image', 'https://placehold.co/1200x700/png?text=Image+Placeholder');
      } else if (type === 'divider') {
        quill.insertText(index, '\n\n');
        quill.insertEmbed(index + 1, 'divider', true);
      }

      renderPreview();
    });
  });

  titleInput.addEventListener('input', renderPreview);
  summaryInput.addEventListener('input', renderPreview);
  tagsInput.addEventListener('input', renderPreview);
  shareUrlInput.addEventListener('input', renderPreview);
  coverImageInput.addEventListener('input', renderPreview);
  docxFileInput.addEventListener('change', () => {
    const file = docxFileInput.files?.[0];
    if (file) parseDocxFile(file).catch((error) => {
      console.error('DOCX parse failed', error);
      alert('Word 文档解析失败，请确认文件是有效的 .docx 文档。');
    });
  });
  fillFromDocxBtn.addEventListener('click', () => {
    const file = docxFileInput.files?.[0];
    if (!file) {
      alert('请先选择一个 Word 文档。');
      return;
    }
    parseDocxFile(file).catch((error) => {
      console.error('DOCX parse failed', error);
      alert('Word 文档解析失败，请确认文件是有效的 .docx 文档。');
    });
  });
  quill.on('text-change', renderPreview);

  previewBtn.addEventListener('click', renderPreview);
  loadSampleBtn.addEventListener('click', sampleContent);

  document.getElementById('shareX').addEventListener('click', () => window.open(buildShareUrl('x'), '_blank', 'noopener,noreferrer'));
  document.getElementById('shareReddit').addEventListener('click', () => window.open(buildShareUrl('reddit'), '_blank', 'noopener,noreferrer'));
  document.getElementById('shareFacebook').addEventListener('click', () => window.open(buildShareUrl('facebook'), '_blank', 'noopener,noreferrer'));

  sampleContent();
});
