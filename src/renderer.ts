import './index.css';

class WebsiteBlocker {
  private websiteInput: HTMLInputElement;
  private messageDiv: HTMLDivElement;
  private blockedList: HTMLDivElement;

  constructor() {
    this.websiteInput = document.getElementById('website') as HTMLInputElement;
    this.messageDiv = document.getElementById('message') as HTMLDivElement;
    this.blockedList = document.getElementById('blocked-list') as HTMLDivElement;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.updateBlockedList();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const blockButton = document.getElementById('blockButton');
    if (blockButton) {
      blockButton.addEventListener('click', () => this.blockWebsite());
    }
  }

  private async blockWebsite(): Promise<void> {
    const website = this.websiteInput.value.trim();
    
    if (!website) {
      this.showMessage('Please enter a website', false);
      return;
    }

    try {
      const result = await window.electronAPI.blockWebsite(website);
      this.showMessage(result.message, result.success);
      if (result.success) {
        this.websiteInput.value = '';
        await this.updateBlockedList();
      }
    } catch (error) {
      this.showMessage((error as Error).message, false);
    }
  }

  private async unblockWebsite(website: string): Promise<void> {
    try {
      const result = await window.electronAPI.unblockWebsite(website);
      this.showMessage(result.message, result.success);
      if (result.success) {
        await this.updateBlockedList();
      }
    } catch (error) {
      this.showMessage((error as Error).message, false);
    }
  }

  private async updateBlockedList(): Promise<void> {
    const blockedWebsites = await window.electronAPI.listBlocked();
    this.blockedList.innerHTML = '';
    
    blockedWebsites.forEach(website => {
      const item = document.createElement('div');
      item.className = 'blocked-item';
      
      const span = document.createElement('span');
      span.textContent = website;
      
      const button = document.createElement('button');
      button.textContent = 'Unblock';
      button.addEventListener('click', () => this.unblockWebsite(website));
      
      item.appendChild(span);
      item.appendChild(button);
      this.blockedList.appendChild(item);
    });
  }

  private showMessage(message: string, isSuccess: boolean): void {
    this.messageDiv.textContent = message;
    this.messageDiv.className = `message ${isSuccess ? 'success' : 'error'}`;
    setTimeout(() => {
      this.messageDiv.textContent = '';
      this.messageDiv.className = 'message';
    }, 3000);
  }
}

new WebsiteBlocker();