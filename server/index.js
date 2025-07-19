const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');

const connectDB = require('./db');
const Log = require('./models/Log');
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// ===============================
// CLONE VM
// ===============================
app.post('/api/clone', (req, res) => {
  const { template_id, vm_count } = req.body;

  if (!template_id || !vm_count) {
    return res.status(400).json({ error: 'template_id and vm_count required' });
  }

  if (parseInt(vm_count) <= 0) {
    return res.status(400).json({ error: 'Invalid input: jumlah VM harus lebih dari 0' });
  }

  const checkCmd = `curl -s -k -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471" https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu/${template_id}/status/current`;

  exec(checkCmd, (checkErr, checkStdout, checkStderr) => {
    if (checkErr) {
      Log.create({
        action: 'clone',
        vm_id: template_id,
        status: 'failed',
        message: 'Template not found or request error',
      });
      return res.status(400).json({ error: 'Template not found' });
    }

    try {
      const statusData = JSON.parse(checkStdout);
      const status = statusData?.data?.status;

      if (!status || status === 'running') {
        Log.create({
          action: 'clone',
          vm_id: template_id,
          status: 'failed',
          message: 'Template not found or is running',
        });
        return res.status(400).json({ error: 'Template invalid or is currently running' });
      }

      const cmd = `ansible-playbook -i ../proxmox-automation/inventory.ini ../proxmox-automation/clone_custom_vms.yaml --extra-vars "template_id=${template_id} vm_count=${vm_count}"`;

      exec(cmd, async (error, stdout, stderr) => {
        const status = error ? 'failed' : 'success';
        const message = error ? stderr : stdout;

        await Log.create({
          action: 'clone',
          vm_id: template_id,
          status,
          message,
        });

        if (error) return res.status(500).json({ error: stderr });
        res.json({ output: stdout });
      });

    } catch (e) {
      console.error('Gagal parse respons Proxmox:', e);
      Log.create({
        action: 'clone',
        vm_id: template_id,
        status: 'failed',
        message: 'Parse error: ' + e.message,
      });
      return res.status(400).json({ error: 'Failed to parse Proxmox API response' });
    }
  });
});

// ===============================
// DELETE VM (banyak ID sekaligus)
// ===============================
app.post('/api/delete', (req, res) => {
  const { vm_ids } = req.body;

  if (!vm_ids || !Array.isArray(vm_ids)) {
    return res.status(400).json({ error: 'vm_ids (array) is required' });
  }

  const vmIdList = vm_ids.join(',');
  const cmd = `ansible-playbook -i ../proxmox-automation/inventory.ini ../proxmox-automation/delete_multiple_by_input.yaml --extra-vars "vm_ids=[${vmIdList}]"`;

  exec(cmd, async (error, stdout, stderr) => {
    const hasilLog = [];
    const regex = /DELETE_RESULT: (\d+) - (.*)/g;
    let match;

    while ((match = regex.exec(stdout)) !== null) {
      const vmId = match[1];
      const message = match[2];
      const status = message.includes("berhasil") ? 'success' : 'failed';

      hasilLog.push({
        action: 'delete',
        vm_id: vmId,
        status,
        message,
      });

      await Log.create({
        action: 'delete',
        vm_id: vmId,
        status,
        message,
      });
    }

    if (error) {
      console.error(`Exec error (delete): ${error}`);
      return res.status(500).json({ error: stderr });
    }

    // Ambil semua baris hasil DELETE_RESULT
    const regexLine = /DELETE_RESULT:.*$/gm;
    let results = stdout.match(regexLine) || [];
    results = results.map(line => line.replace(/"$/, "")); // hilangkan kutip dua di akhir baris
    res.json({ results });
  });
});

// ===============================
// DELETE ALL VM (kecuali yang dikecualikan)
// ===============================
app.post('/api/delete-all', (req, res) => {
  const cmd = `ansible-playbook -i ../proxmox-automation/inventory.ini ../proxmox-automation/delete_all_except.yaml`;
  exec(cmd, async (error, stdout, stderr) => { 
    if (error) {
      return res.status(500).json({ error: stderr });
    }

    // Logging per VM
    const regex = /DELETE_RESULT: (\d+) - (.*)/g;
    let match;
    while ((match = regex.exec(stdout)) !== null) {
      const vmId = match[1];
      const message = match[2];
      const status = message.includes("berhasil") ? 'success' : 'failed';

      await Log.create({
        action: 'delete-all',
        vm_id: vmId,
        status,
        message,
      });
    }

    // Ambil semua baris hasil DELETE_RESULT
    const regexLine = /DELETE_RESULT:.*$/gm;
    let results = stdout.match(regexLine) || [];

    // Hilangkan tanda kutip dua di akhir setiap baris (kalau ada)
    results = results.map(line => line.replace(/"$/, ""));
    res.json({ results });
  });
});

// ===============================
// LIST VM (ID, STATUS, IP)
// ===============================
app.get('/api/list', (req, res) => {
  const cmd = 'ansible-playbook -i ../proxmox-automation/inventory.ini ../proxmox-automation/list_vm_with_ip.yaml';

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Exec error (list): ${error}`);
      return res.status(500).json({ error: stderr || error.message });
    }
    res.json({ output: stdout });
  });
});

// ===============================
// LIST VM (ARRAY)
// ===============================

const VM_INFO_REGEX = /VM_INFO: (\d+) - (running|stopped) - (.+)/g;

app.get('/api/list-array', (req, res) => {
  const cmd = 'ansible-playbook -i ../proxmox-automation/inventory.ini ../proxmox-automation/list_vm_with_ip.yaml';

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Exec error (list-array): ${error}`);
      return res.status(500).json({ error: stderr || error.message });
    }

    // Parse VM_INFO log lines into array
    const vmArray = [];
    let match;
    while ((match = VM_INFO_REGEX.exec(stdout)) !== null) {
      vmArray.push({
        vmid: match[1],
        status: match[2],
        ip: match[3].replace(/\\n"?$/, '').replace(/"$/, '').trim(),
      });
    }
    res.json({ vms: vmArray });
  });
});

// ===============================
// BACKUP VM SCHEDULED
// ===============================
app.post('/api/schedule-backup', (req, res) => {
  const { vm_ids, preset, backup_time } = req.body;

  if (!vm_ids || !preset) {
    return res.status(400).json({ error: 'vm_ids dan preset required' });
  }

  // Preset yang butuh jam
  const presetsNeedTime = ['daily', 'monday-friday', 'every-saturday', 'first-day-month', 'first-day-year'];

  if (presetsNeedTime.includes(preset) && !backup_time) {
    return res.status(400).json({ error: 'backup_time required untuk preset ini' });
  }

  let cronPattern = '';

  // Auto pattern tanpa jam
  if (preset === 'every-hour') {
    cronPattern = `0 * * * *`;
  } else if (preset === 'every-30-minutes') {
    cronPattern = `*/30 * * * *`;
  } else if (preset === 'every-2-hours') {
    cronPattern = `0 */2 * * *`;
  } else {
    // Preset yang perlu jam custom
    const [hour, minute] = backup_time.split(':');
    switch (preset) {
      case 'daily':
        cronPattern = `${minute} ${hour} * * *`;
        break;
      case 'monday-friday':
        cronPattern = `${minute} ${hour} * * 1-5`;
        break;
      case 'every-saturday':
        cronPattern = `${minute} ${hour} * * 6`;
        break;
      case 'first-day-month':
        cronPattern = `${minute} ${hour} 1 * *`;
        break;
      case 'first-day-year':
        cronPattern = `${minute} ${hour} 1 1 *`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid preset' });
    }
  }

  const idList = vm_ids.join(',');
  const cronLine = `${cronPattern} cd /home/nadnin/dashboard-proxmox/proxmox-automation && /usr/bin/ansible-playbook -i inventory.ini backup_multiple_idle_wrapper.yaml --extra-vars "vm_ids=[${idList}] backup_time_expected='${backup_time || 'auto'}' preset_schedule='${preset}'" >> ~/backup_logs/backup_idle.log 2>&1\n`;

  if (!fs.existsSync('../proxmox-automation/backup-schedules')) {
    fs.mkdirSync('../proxmox-automation/backup-schedules');
  }

  fs.writeFileSync('../proxmox-automation/backup-schedules/scheduled_cron.txt', cronLine);

  const cmd = 'crontab -r; crontab ../proxmox-automation/backup-schedules/scheduled_cron.txt';

  exec(cmd, async (error, stdout, stderr) => {
    const vmLogTasks = vm_ids.map(async (vmid) => {
      const status = error ? 'failed' : 'success';
      const message = error ? stderr : `Backup dijadwalkan (${preset}${backup_time ? ' ' + backup_time : ''}) untuk VM ${vmid}`;

      return Log.create({
        action: 'backup',
        vm_id: vmid,
        status,
        message
      });
    });

    await Promise.all(vmLogTasks);

    if (error) {
      console.error(`Schedule error: ${error}`);
      return res.status(500).json({ error: stderr });
    }
    res.json({ message: `Backup VM [${idList}] dijadwalkan (${preset}${backup_time ? ' ' + backup_time : ''})` });
  });
});

// ===============================
// BACKUP ALL VM (exclude PBS 107 & template)
// ===============================
app.post('/api/backup-all-vm', (req, res) => {
  const { backup_time, preset } = req.body;

  if (!preset) {
    return res.status(400).json({ error: 'preset required' });
  }

  // Preset yang butuh jam custom
  const presetsNeedTime = ['daily', 'monday-friday', 'every-saturday', 'first-day-month', 'first-day-year'];

  if (presetsNeedTime.includes(preset) && !backup_time) {
    return res.status(400).json({ error: 'backup_time required untuk preset ini' });
  }

  let cronPattern = '';

  if (preset === 'every-hour') {
    cronPattern = `0 * * * *`;
  } else if (preset === 'every-30-minutes') {
    cronPattern = `*/30 * * * *`;
  } else if (preset === 'every-2-hours') {
    cronPattern = `0 */2 * * *`;
  } else {
    const [hour, minute] = backup_time.split(':');
    switch (preset) {
      case 'daily':
        cronPattern = `${minute} ${hour} * * *`;
        break;
      case 'monday-friday':
        cronPattern = `${minute} ${hour} * * 1-5`;
        break;
      case 'every-saturday':
        cronPattern = `${minute} ${hour} * * 6`;
        break;
      case 'first-day-month':
        cronPattern = `${minute} ${hour} 1 * *`;
        break;
      case 'first-day-year':
        cronPattern = `${minute} ${hour} 1 1 *`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid preset' });
    }
  }

  const cronLine = `${cronPattern} cd /home/nadnin/dashboard-proxmox/proxmox-automation && /usr/bin/ansible-playbook -i inventory.ini backup_all_idle_wrapper.yaml --extra-vars "backup_time_expected='${backup_time || 'auto'}' preset_schedule='${preset}'" >> ~/backup_logs/backup_idle_all.log 2>&1\n`;

  if (!fs.existsSync('../proxmox-automation/backup-schedules')) {
    fs.mkdirSync('../proxmox-automation/backup-schedules');
  }

  fs.writeFileSync('../proxmox-automation/backup-schedules/scheduled_cron_all_vm.txt', cronLine);

  const cmd = 'crontab -r; crontab ../proxmox-automation/backup-schedules/scheduled_cron_all_vm.txt';

  exec(cmd, async (error, stdout, stderr) => {
    const status = error ? 'failed' : 'success';
    const message = error ? stderr : `Backup ALL VM dijadwalkan (${preset}${backup_time ? ' ' + backup_time : ''})`;

    await Log.create({
      action: 'backup-all',
      vm_id: '-',
      status,
      message,
    });

    if (error) {
      return res.status(500).json({ error: stderr });
    }

    res.json({ message });
  });
});

// ===============================
// STOP BACKUP VM
// ===============================
app.post('/api/stop-backup', (req, res) => {
  const cmd = `crontab -r`;

  exec(cmd, async (error, stdout, stderr) => {
    const status = error ? 'failed' : 'success';
    const message = error ? stderr : 'Semua backup rutin dihentikan';

    await Log.create({
      action: 'stop-backup',
      vm_id: '-', // atau bisa dikosongkan jika tidak spesifik ke VM
      status,
      message
    });

    if (error) {
      console.error(`Stop error: ${error}`);
      return res.status(500).json({ error: stderr });
    }
    res.json({ message });
  });
});

// ===============================
// LIST SCHEDULED BACKUP (CRON)
// ===============================
app.get('/api/list-schedule-backup', (req, res) => {
  exec('crontab -l', (error, stdout, stderr) => {
    if (error || !stdout.trim()) return res.json([]);
    const lines = stdout.split('\n').filter(line =>
      line.includes('ansible-playbook') && (
        line.includes('backup_multiple_idle_wrapper.yaml') ||
        line.includes('backup_all_idle_wrapper.yaml')
      )
    );
    const schedules = lines.map(line => {
      // === BACKUP MULTIPLE VM (by VM ID) ===
      const matchByIds = line.match(
        /backup_multiple_idle_wrapper\.yaml --extra-vars "vm_ids=\[([^\]]*)\] backup_time_expected='([^']*)' preset_schedule='([^']*)'"/
      );
      // === BACKUP ALL VM ===
      const matchAll = line.match(
        /backup_all_idle_wrapper\.yaml --extra-vars "backup_time_expected='([^']*)' preset_schedule='([^']*)'"/
      );
      if (matchByIds) {
        return {
          type: 'by-vm',
          vm_ids: matchByIds[1].split(',').map(s => s.trim()),
          backup_time: matchByIds[2],
          preset: matchByIds[3],
        };
      } else if (matchAll) {
        return {
          type: 'all',
          vm_ids: 'ALL',
          backup_time: matchAll[1],
          preset: matchAll[2],
        };
      }
      return null;
    }).filter(Boolean);

    res.json(schedules);
  });
});

// ===============================
// LIST BACKUPS for RECOVERY
// ===============================
const moment = require('moment-timezone'); // pastikan sudah install: npm install moment-timezone
moment.locale('id'); // biar tanggal pakai bahasa Indo

app.get('/api/list-backups', async (req, res) => {
  const backupsFile = '../proxmox-automation/backup_list.json';

  if (!fs.existsSync(backupsFile)) {
    await Log.create({
      action: 'list-backups',
      vm_id: '-',
      status: 'failed',
      message: 'backup_list.json tidak ditemukan'
    });
    return res.json({ backups: [] });
  }

  try {
    const content = fs.readFileSync(backupsFile);
    const rawBackups = JSON.parse(content);

    // Ubah ke format user-friendly, tapi tetap simpan raw
    const parsedBackups = rawBackups.map(raw => {
      // Pola: [storage:]backup/vm/{vmid}/{datetime}
      // Support .000Z (milisecond) maupun Z saja
      const regex = /^(.*?):?backup\/vm\/(\d+)\/([0-9T:\.-]+)(?:\.000)?Z$/;
      const match = raw.match(regex);

      if (!match) {
        // fallback: tetap tampilkan data mentah
        return {
          raw,
          display: raw
        };
      }

      let [, storage, vmid, datetime_utc] = match;
      // Pastikan datetime_utc tanpa .000, tambah Z
      datetime_utc = datetime_utc + 'Z';

      // Convert UTC ke Jakarta
      const jakartaTime = moment(datetime_utc).tz('Asia/Jakarta');
      const tanggal = jakartaTime.format('D MMMM YYYY');
      const jam = jakartaTime.format('HH:mm:ss');

      return {
        storage: storage || '-',
        vmid,
        datetime_utc,
        datetime_jakarta: jakartaTime.format('YYYY-MM-DD HH:mm:ss'),
        display: `VM ${vmid} - ${tanggal} ${jam} WIB`,
        raw // <<=== ini field yang dipakai buat recovery
      };
    });

    await Log.create({
      action: 'list-backups',
      vm_id: '-',
      status: 'success',
      message: `Berhasil load ${parsedBackups.length} backup dari file`
    });

    res.json({ backups: parsedBackups });

  } catch (e) {
    await Log.create({
      action: 'list-backups',
      vm_id: '-',
      status: 'failed',
      message: `Gagal parse JSON backup: ${e.message}`
    });

    res.status(500).json({ error: 'Gagal membaca backup_list.json' });
  }
});

// ===============================
// RECOVER VM
// ===============================
function fixBackupName(name) {
  return name.replace(/\.000Z$/, 'Z');
}

app.post('/api/recover', (req, res) => {
  const { backups, vmids } = req.body;

  if (!backups || !vmids) {
    return res.status(400).json({ error: 'backups and vmids required' });
  }

  // Perbaiki format backup name
  const cleanedBackups = backups.map(backup => {
    let fixed = backup.startsWith('local:') ? backup.slice('local:'.length) : backup;
    return fixBackupName(fixed);
  });

  // Compose extra-vars sebagai JSON (bukan list, bukan pakai kutip satu!)
  const extraVars = JSON.stringify({
    backup_list_user: cleanedBackups,
    vmid_list_user: vmids
  });

  const cmd = `ansible-playbook -i ../proxmox-automation/inventory.ini ../proxmox-automation/recovery_selected_backup.yaml --extra-vars '${extraVars}'`;

  exec(cmd, async (error, stdout, stderr) => {
    // Log dengan cleanedBackups yang pasti defined
    for (let i = 0; i < vmids.length; i++) {
      await Log.create({
        action: 'recovery',
        vm_id: vmids[i],
        status: error ? 'failed' : 'success',
        message: error ? stderr : `Recovered from ${cleanedBackups[i]}`
      });
    }

    if (error) {
      console.error(`Recovery error: ${error}`);
      return res.status(500).json({ error: stderr });
    }

    res.json({ output: stdout });
  });
});

// ===============================
// RECOVER ALL VM
// ===============================
app.post('/api/recover-all-backup', async (req, res) => {
  try {
    // 1. Baca semua file backup
    const backupsPath = path.resolve(__dirname, '../proxmox-automation/backup_list.json');
    if (!fs.existsSync(backupsPath)) {
      return res.status(404).json({ error: 'backup_list.json tidak ditemukan' });
    }
    const raw = fs.readFileSync(backupsPath, 'utf8');
    const backupList = JSON.parse(raw);

    // Tambahan validasi backup kosong:
    const validBackups = Array.isArray(backupList)
      ? backupList.filter(b => b && b['backup-id'])
      : [];
    if (!Array.isArray(backupList) || validBackups.length === 0) {
      return res.status(404).json({ error: 'Tidak ada backup yang tersedia untuk recovery.' });
    }

    // 2. Group backup berdasarkan VMID, ambil backup terbaru per VMID
    const backupMap = {};
    for (const backup of validBackups) {
      const vmid = backup['backup-id'];
      if (!backupMap[vmid] || backup['backup-time'] > backupMap[vmid]['backup-time']) {
        backupMap[vmid] = backup;
      }
    }
    // List backup terbaru untuk tiap VMID (sorted by VMID)
    const sortedVmid = Object.keys(backupMap).map(Number).sort((a, b) => a - b);
    const selectedBackups = sortedVmid.map(vmid => backupMap[vmid]);

    // Format volid PBS: "pbs-nadnin:backup/vm/100/2025-05-21T06:48:13Z"
    const backupFiles = selectedBackups.map(b => {
      // Format waktu UTC ISO string
      const utc = require('moment').unix(b['backup-time']).utc();
      const iso = utc.toISOString().replace('.000Z', 'Z');
      return `pbs-nadnin:backup/vm/${b['backup-id']}/${iso}`;
    });

    // 3. Ambil VMID terakhir di Proxmox (agar VMID baru berurutan)
    const curlList = `curl -sk -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471" "https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu"`;
    exec(curlList, async (err, stdout) => {
      if (err) return res.status(500).json({ error: 'Gagal fetch list VM Proxmox' });
      let vmList;
      try {
        vmList = JSON.parse(stdout).data || [];
      } catch (e) {
        return res.status(500).json({ error: 'Gagal parsing VM list' });
      }
      // VMID terakhir
      let lastVmid = Math.max(...vmList.map(vm => Number(vm.vmid)), 100);

      // 4. Generate VMID baru urut
      const vmidListUser = selectedBackups.map((_, i) => lastVmid + 1 + i);

      // 5. Jalankan playbook recovery
      const extraVars = JSON.stringify({
        backup_list_user: backupFiles,
        vmid_list_user: vmidListUser
      });

      const playbookCmd = `ansible-playbook -i ../proxmox-automation/inventory.ini ../proxmox-automation/recovery_selected_backup.yaml --extra-vars '${extraVars}'`;

      exec(playbookCmd, async (err2, stdout2, stderr2) => {
        // Build result mapping array
        const resultMapping = selectedBackups.map((backup, idx) => ({
          old_vmid: backup['backup-id'],
          new_vmid: vmidListUser[idx],
          backup_volid: backupFiles[idx]
        }));

        // Logging hasil ke MongoDB
        for (let i = 0; i < vmidListUser.length; i++) {
          await Log.create({
            action: 'recovery-all',
            vm_id: vmidListUser[i],
            status: err2 ? 'failed' : 'success',
            message: err2 ? stderr2 : `Recovered from ${backupFiles[i]} (old_vmid: ${selectedBackups[i]['backup-id']})`
          });
        }

        if (err2) {
          return res.status(500).json({
            error: stderr2,
            output: stdout2,
            mapping: resultMapping
          });
        }
        res.json({
          message: 'Recovery all backup berhasil',
          mapping: resultMapping, // <== INI YANG DIPAKAI FRONTEND
          output: stdout2
        });
      });
    });
  } catch (e) {
    return res.status(500).json({ error: 'Terjadi error: ' + e.message });
  }
});

// ===============================
// START MULTIPLE VM
// ===============================
app.post('/api/start-vms', (req, res) => {
  const { vm_ids } = req.body;
  if (!Array.isArray(vm_ids) || vm_ids.length === 0) {
    return res.status(400).json({ message: 'Tidak ada VM yang diminta untuk start' });
  }

  const listCmd = `curl -sk -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471" "https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu"`;

  exec(listCmd, (err, stdout) => {
    if (err) {
      return res.status(500).json({ error: 'Gagal ambil daftar VM' });
    }

    let vmList;
    try {
      vmList = JSON.parse(stdout).data;
    } catch (e) {
      return res.status(500).json({ error: 'Gagal parsing data VM dari Proxmox API' });
    }

    const vmMap = Object.fromEntries(vmList.map(vm => [vm.vmid.toString(), vm]));
    const results = [];
    let pending = 0;

    vm_ids.forEach(vmid => {
      const vm = vmMap[vmid.toString()];
      if (!vm) {
        results.push({ vmid, success: false, message: 'VM ID tidak ditemukan' });
        return;
      }

      if (vm.template === 1) {
        results.push({ vmid, success: false, message: 'VM ID adalah template dan tidak bisa dijalankan' });
        return;
      }

      if (vm.status === 'running') {
        results.push({ vmid, success: false, message: 'VM sudah dalam keadaan running' });
        return;
      }

      pending++;
      const cmd = `curl -k -X POST "https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu/${vmid}/status/start" -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471"`;

      exec(cmd, (error, stdout, stderr) => {
        const result = {
          vmid,
          success: !error,
          message: error ? stderr : 'Started'
        };

        Log.create({
          action: 'start',
          vm_id: vmid,
          status: result.success ? 'success' : 'failed',
          message: result.message
        });

        results.push(result);

        if (--pending === 0) {
          res.json(results);
        }
      });
    });

    if (pending === 0) {
      res.json(results);
    }
  });
});

// ===============================
// BULK START VM (skip template & status running)
// ===============================
app.post('/api/start-all-vms', (req, res) => {
  const curlList = `curl -sk -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471" "https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu"`;

  exec(curlList, (err, stdout) => {
    if (err) return res.status(500).json({ error: 'Gagal ambil list VM' });

    let vmList;
    try {
      vmList = JSON.parse(stdout).data;
    } catch (e) {
      return res.status(500).json({ error: 'Gagal parsing data VM dari Proxmox' });
    }

    const results = [];
    const toStart = vmList.filter(vm => vm.status !== 'running' && vm.template !== 1);
    const alreadyRunning = vmList.filter(vm => vm.status === 'running' && vm.template !== 1);

    alreadyRunning.forEach(vm => {
      results.push({
        vmid: vm.vmid,
        success: false,
        message: 'VM sudah dalam keadaan running',
        skipped: true
      });
    });

    if (toStart.length === 0) {
      return res.json(results);
    }

    let pending = toStart.length;

    toStart.forEach(vm => {
      const vmid = vm.vmid;
      const startCmd = `curl -sk -X POST "https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu/${vmid}/status/start" -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471"`;

      exec(startCmd, async (error, stdout, stderr) => {
        const success = !error;
        const message = success ? 'Started' : stderr;

        results.push({ vmid, success, message, skipped: false });

        await Log.create({
          action: 'start',
          vm_id: vmid,
          status: success ? 'success' : 'failed',
          message
        });

        if (--pending === 0) {
          res.json(results);
        }
      });
    });
  });
});

// ===============================
// STOP MULTIPLE VM
// ===============================
app.post('/api/stop-vms', (req, res) => {
  const { vm_ids } = req.body;


  if (!Array.isArray(vm_ids) || vm_ids.length === 0) {
    return res.json([{ success: false, message: 'Tidak ada VM yang diminta untuk stop' }]);
  }

  const listCmd = `curl -sk -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471" "https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu"`;

  exec(listCmd, (err, stdout) => {
    if (err) {
      return res.status(500).json({ error: 'Gagal ambil daftar VM' });
    }

    let vmList;
    try {
      vmList = JSON.parse(stdout).data;
    } catch (e) {
      return res.status(500).json({ error: 'Gagal parsing data VM dari Proxmox API' });
    }

    const vmMap = Object.fromEntries(vmList.map(vm => [vm.vmid.toString(), vm]));
    const results = [];

    const validIds = vm_ids.filter(id => {
      const vm = vmMap[id.toString()];
      return vm && vm.template !== 1 && vm.status !== 'stopped';
    });

    let pending = validIds.length;

    // Proses info untuk semua ID yang diberikan user
    vm_ids.forEach(vmid => {
      const vm = vmMap[vmid.toString()];
      if (!vm) {
        results.push({ vmid, success: false, message: 'VM ID tidak ditemukan' });
      } else if (vm.template === 1) {
        results.push({ vmid, success: false, message: 'VM ini adalah template dan tidak bisa distop' });
      } else if (vm.status === 'stopped') {
        results.push({ vmid, success: false, message: 'VM sudah dalam keadaan stopped' });
      }
    });

    if (validIds.length === 0) {
      return res.json(results); // tidak ada VM valid untuk diproses
    }

    validIds.forEach(vmid => {
      const stopCmd = `curl -sk -X POST "https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu/${vmid}/status/stop" -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471"`;

      exec(stopCmd, async (error, stdout, stderr) => {
        const success = !error;
        const message = error ? stderr : 'Stop berhasil';

        results.push({ vmid, success, message });

        await Log.create({
          action: 'stop',
          vm_id: vmid,
          status: success ? 'success' : 'failed',
          message,
        });

        if (--pending === 0) {
          // Gabungkan hasil dengan VM yang tadi sudah ditolak
          const merged = vm_ids.map(id =>
            results.find(r => r.vmid === id) || { vmid: id, success: false, message: 'Tidak diketahui' }
          );
          res.json(merged);
        }
      });
    });
  });
});

// ===============================
// BULK STOP  VM
// ===============================
app.post('/api/stop-all-vms', (req, res) => {
  const listCmd = `curl -sk -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471" "https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu"`;

  exec(listCmd, (err, stdout) => {
    if (err) {
      return res.status(500).json({ error: 'Gagal ambil daftar VM' });
    }

    let vmList;
    try {
      vmList = JSON.parse(stdout).data;
    } catch (e) {
      return res.status(500).json({ error: 'Gagal parsing data VM dari Proxmox API' });
    }

    const excludedVmIds = [103];
    const runningVMs = vmList.filter(
      vm => vm.template !== 1 && !excludedVmIds.includes(Number(vm.vmid))
    );

    const results = [];
    let pending = runningVMs.length;

    if (pending === 0) {
      return res.json({ message: 'Tidak ada VM valid untuk diproses' });
    }

    runningVMs.forEach(vm => {
      const { vmid, status } = vm;

      if (status === 'stopped') {
        results.push({ vmid, success: false, message: 'VM sudah dalam keadaan stopped' });
        if (--pending === 0) {
          res.json(results);
        }
        return;
      }

      const cmd = `curl -sk -X POST "https://10.91.0.184:8006/api2/json/nodes/nadnin/qemu/${vmid}/status/stop" -H "Authorization: PVEAPIToken=root@pam!my-dashboard-id=f2a79cbf-54c7-423e-a353-f1834f5c9471"`;

      exec(cmd, async (error, stdout, stderr) => {
        const success = !error;
        const message = error ? stderr : 'Stop berhasil';

        results.push({ vmid, success, message });

        await Log.create({
          action: 'stop-all',
          vm_id: vmid,
          status: success ? 'success' : 'failed',
          message,
        });

        if (--pending === 0) {
          res.json(results);
        }
      });
    });
  });
});

// ===============================
// LIST TEMPLATE
// ===============================
app.get('/api/templates', (req, res) => {
  const path = require('path');
  const templatePlaybookPath = path.resolve(__dirname, '../proxmox-automation/list-templates/list_template_vm.yaml');
  const templateJsonPath = path.resolve(__dirname, '../proxmox-automation/list-templates/template_vm_info.json');

  const cmd = `ansible-playbook -i ../proxmox-automation/inventory.ini ${templatePlaybookPath}`;
  // Jalankan playbook untuk update template
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'Gagal update data template VM: ' + stderr });
    }
    fs.readFile(templateJsonPath, 'utf8', async (err, data) => {
      if (err) {
        await Log.create({
          action: 'list-template',
          vm_id: '-',
          status: 'failed',
          message: `Gagal baca file template: ${err.message}`
        });
        return res.status(500).json({ error: 'Gagal baca file template VM' });
      }
      try {
        const templates = JSON.parse(data);
        await Log.create({
          action: 'list-template',
          vm_id: '-',
          status: 'success',
          message: `Berhasil load ${templates.length} template VM`
        });
        res.json({ templates });
      } catch (err) {
        await Log.create({
          action: 'list-template',
          vm_id: '-',
          status: 'failed',
          message: `Gagal parsing JSON template: ${err.message}`
        });
        res.status(500).json({ error: 'Gagal parsing file JSON' });
      }
    });
  });
});

// ===============================
// FETCH BACKUP
// ===============================
app.get('/api/fetch-backup', (req, res) => {
  const cmd = 'ansible-playbook -i ../proxmox-automation/inventory.ini ../proxmox-automation/fetch_backup_list.yaml';

  exec(cmd, async (err, stdout, stderr) => {
    if (err) {
      await Log.create({
        action: 'fetch-backup',
        vm_id: '-',
        status: 'failed',
        message: `Ansible error: ${stderr}`
      });

      console.error(`Gagal fetch backup: ${stderr}`);
      return res.status(500).json({ error: 'Gagal update backup list' });
    }

    fs.readFile('../proxmox-automation/backup_list.json', 'utf8', async (err, data) => {
      if (err) {
        await Log.create({
          action: 'fetch-backup',
          vm_id: '-',
          status: 'failed',
          message: `Gagal baca backup_list.json: ${err.message}`
        });

        console.error(`Gagal baca backup_list.json: ${err}`);
        return res.status(500).json({ error: 'Gagal baca file backup' });
      }

      try {
        const backups = JSON.parse(data);

        await Log.create({
          action: 'fetch-backup',
          vm_id: '-',
          status: 'success',
          message: `Backup list fetched, total: ${backups.length}`
        });

        res.json({ backups });

      } catch (e) {
        await Log.create({
          action: 'fetch-backup',
          vm_id: '-',
          status: 'failed',
          message: `Format JSON tidak valid: ${e.message}`
        });

        res.status(500).json({ error: 'Format JSON tidak valid' });
      }
    });
  });
});

// ===============================
// START SERVER
// ===============================
const PORT = 8091;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
