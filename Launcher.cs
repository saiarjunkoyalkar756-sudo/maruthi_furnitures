using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;

namespace MaruthiFurnituresLauncher
{
    static class Program
    {
        static bool IsPortListening(int port)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(800);
                    if (success && client.Connected)
                    {
                        client.EndConnect(result);
                        return true;
                    }
                }
            }
            catch { }
            return false;
        }

        [STAThread]
        static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;

            // 1. Ensure MySQL (XAMPP) is running on port 3306
            if (!IsPortListening(3306))
            {
                string mysqlBat = @"C:\xampp\mysql_start.bat";
                string mysqlExe = @"C:\xampp\mysql\bin\mysqld.exe";

                try
                {
                    if (File.Exists(mysqlBat))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = "/c \"" + mysqlBat + "\"",
                            WorkingDirectory = @"C:\xampp",
                            WindowStyle = ProcessWindowStyle.Hidden,
                            CreateNoWindow = true,
                            UseShellExecute = true
                        };
                        Process.Start(psi);
                    }
                    else if (File.Exists(mysqlExe))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = "/c start \"\" /b \"" + mysqlExe + "\" --defaults-file=mysql\\bin\\my.ini --standalone",
                            WorkingDirectory = @"C:\xampp",
                            WindowStyle = ProcessWindowStyle.Hidden,
                            CreateNoWindow = true,
                            UseShellExecute = true
                        };
                        Process.Start(psi);
                    }
                }
                catch { }

                // Wait up to 10 seconds for MySQL to listen on port 3306
                for (int i = 0; i < 20; i++)
                {
                    if (IsPortListening(3306)) break;
                    Thread.Sleep(500);
                }
            }

            // 2. Ensure Apache (XAMPP) is running on port 80
            if (!IsPortListening(80))
            {
                string apacheBat = @"C:\xampp\apache_start.bat";
                string httpdExe = @"C:\xampp\apache\bin\httpd.exe";

                try
                {
                    if (File.Exists(apacheBat))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = "/c \"" + apacheBat + "\"",
                            WorkingDirectory = @"C:\xampp",
                            WindowStyle = ProcessWindowStyle.Hidden,
                            CreateNoWindow = true,
                            UseShellExecute = true
                        };
                        Process.Start(psi);
                    }
                    else if (File.Exists(httpdExe))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = "/c start \"\" /b \"" + httpdExe + "\"",
                            WorkingDirectory = @"C:\xampp\apache",
                            WindowStyle = ProcessWindowStyle.Hidden,
                            CreateNoWindow = true,
                            UseShellExecute = true
                        };
                        Process.Start(psi);
                    }
                }
                catch { }

                // Wait for Apache
                for (int i = 0; i < 15; i++)
                {
                    if (IsPortListening(80)) break;
                    Thread.Sleep(400);
                }
            }

            // 3. Ensure Next.js and Telegram poller are running
            string nodePath = @"C:\Program Files\nodejs\node.exe";
            if (!File.Exists(nodePath)) nodePath = @"C:\Program Files (x86)\nodejs\node.exe";
            if (!File.Exists(nodePath)) nodePath = "node.exe";

            if (!IsPortListening(3000))
            {
                string nextBin = Path.Combine(appDir, @"node_modules\next\dist\bin\next");

                try
                {
                    ProcessStartInfo nextPsi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c start \"\" /b \"" + nodePath + "\" \"" + nextBin + "\" start",
                        WorkingDirectory = appDir,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true,
                        UseShellExecute = true
                    };
                    Process.Start(nextPsi);
                }
                catch { }

                // Wait up to 20 seconds until port 3000 is verified open
                for (int i = 0; i < 40; i++)
                {
                    if (IsPortListening(3000))
                        break;
                    Thread.Sleep(500);
                }
            }

            // 4. Start Telegram Poller in background
            try
            {
                string pollerPath = Path.Combine(appDir, @"scripts\telegramPoller.js");
                if (File.Exists(pollerPath))
                {
                    ProcessStartInfo pollerPsi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c start \"\" /b \"" + nodePath + "\" \"" + pollerPath + "\"",
                        WorkingDirectory = appDir,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true,
                        UseShellExecute = true
                    };
                    Process.Start(pollerPsi);
                }
            }
            catch { }

            // Delay to let everything settle
            Thread.Sleep(800);

            // 5. Open in dedicated Desktop App window (Edge or Chrome App Mode)
            string targetUrl = "http://localhost/";
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";

            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (!File.Exists(chromePath))
                chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";

            if (File.Exists(edgePath))
            {
                Process.Start(edgePath, "--app=" + targetUrl);
            }
            else if (File.Exists(chromePath))
            {
                Process.Start(chromePath, "--app=" + targetUrl);
            }
            else
            {
                Process.Start(targetUrl);
            }
        }
    }
}
