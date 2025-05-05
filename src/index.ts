#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { IPFind } from "./ipfind.js";
import type { IPFindIPResponse, IPFindUsageResponse } from './types.js';

// 创建MCP服务器
const server = new McpServer({
    name: 'ip-geolocation',
    version: '1.0.0',
});

// 检查环境变量中是否有API密钥
let apiKey = process.env.IPFIND_API_KEY;
if (!apiKey) {
    console.error("IPFIND_API_KEY not provided in environment variables.");
    process.exit(1);
}

// 初始化IPFind实例
const ipfind = new IPFind(apiKey);

// 注册IP地理位置工具
server.tool(
    'get-ip-location',
    'Get location and network information for an IP address',
    {
        ip: z.string().describe("IP address to lookup")
    },
    async ({ ip }) => {
        try {
            const ipInfo = await ipfind.apiRequest.getIPLocation(ip);
            return {
                content: [
                    {
                        type: 'text',
                        text: formatIPData(ipInfo, ip),
                    },
                ],
            };
        } catch (error) {
            console.error('[ERROR] Failed to get IP geolocation:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error fetching IP data: ${error.message}`,
                    },
                ],
            };
        }
    },
);

// 注册我的位置工具
server.tool(
    'get-my-location',
    'Get location and network information for the current IP address',
    {}, // 无需输入参数
    async () => {
        try {
            const ipInfo = await ipfind.apiRequest.getMyLocation();
            return {
                content: [
                    {
                        type: 'text',
                        text: formatIPData(ipInfo, ipInfo.ip_address || 'current IP'),
                    },
                ],
            };
        } catch (error) {
            console.error('[ERROR] Failed to get current IP geolocation:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error fetching current IP data: ${error.message}`,
                    },
                ],
            };
        }
    },
);

// 注册API使用情况工具
server.tool(
    'get-api-usage',
    'Get the usage statistics of the IPFind API',
    {}, // 无需输入参数
    async () => {
        try {
            const usageInfo = await ipfind.apiRequest.getAPIUsage();
            return {
                content: [
                    {
                        type: 'text',
                        text: formatUsageData(usageInfo),
                    },
                ],
            };
        } catch (error) {
            console.error('[ERROR] Failed to get API usage:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error fetching API usage data: ${error.message}`,
                    },
                ],
            };
        }
    }
);

// 格式化IP数据的函数
function formatIPData(ipInfo: IPFindIPResponse, ip: string): string {
    return [
        `IP Location Information for ${ip}:`,
        `• Location: ${ipInfo.city || 'Unknown'}, ${ipInfo.region || 'Unknown'}, ${ipInfo.country || 'Unknown'}`,
        `• Coordinates: ${ipInfo.latitude}, ${ipInfo.longitude}`,
        `• Timezone: ${ipInfo.timezone || 'Unknown'}`,
        `• Network: ${ipInfo.owner || 'Unknown'}`,
        `• Languages: ${ipInfo.languages?.join(', ') || 'Unknown'}`,
        `• Currency: ${ipInfo.currency || 'Unknown'}`
    ].join('\n');
}

// 格式化API使用情况数据的函数
function formatUsageData(usageInfo: IPFindUsageResponse): string {
    return [
        `IPFind API Usage Statistics:`,
        `• Requests Used: ${usageInfo.request_count}`,
        `• Requests Limit: ${usageInfo.daily_request_limit}`,
        `• Requests Remaining: ${usageInfo.remaining}`
    ].join('\n');
}

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('IPFind Geolocation MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
